#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Created because I like PHP too much, and need
# a breath of fresh air from another programming
# language.
#
# tslocum@gmail.com
# http://www.tj9991.com
# http://www.kusaba.org

__author__ = 'Trevor Slocum'

THREADS_SHOWN_ON_THREAD_LIST = 200

THREADS_SHOWN_ON_FRONT_PAGE = 10
REPLIES_SHOWN_ON_FRONT_PAGE = 10

import string
import cgi
import wsgiref.handlers
import os
import time
import datetime
import re
import zlib

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext import db

from time import strftime
from datetime import datetime
from hashlib import md5
from hashlib import sha224

# Set to true if we want to have our webapp print stack traces, etc
_DEBUG = False

class Page(db.Model):
  board        = db.CategoryProperty()
  identifier   = db.StringProperty()
  contents     = db.BlobProperty()
  
class UserPrefs(db.Model):
  user       = db.UserProperty()
  level      = db.CategoryProperty()
  posts      = db.IntegerProperty()

class Ban(db.Model):
  ip             = db.StringProperty()
  reason         = db.StringProperty()

class Board(db.Model):
  directory = db.StringProperty()
  name = db.StringProperty()
  description = db.StringProperty()

class Post(db.Model):
  board          = db.CategoryProperty()
  parentid       = db.IntegerProperty()
  author         = db.UserProperty()
  posts          = db.IntegerProperty()
  image          = db.BlobProperty(default=None)
  image_width    = db.IntegerProperty()
  image_height   = db.IntegerProperty()
  ip             = db.StringProperty()
  name           = db.StringProperty()
  tripcode       = db.StringProperty()
  email          = db.StringProperty()
  subject        = db.StringProperty()
  message        = db.TextProperty()
  password       = db.StringProperty()
  date           = db.DateTimeProperty(auto_now_add=True)
  date_formatted = db.StringProperty()
  bumped         = db.DateTimeProperty(auto_now_add=True)
  deleted        = db.BooleanProperty()

class Thread():
  relid = 0
  navlinks = ''
  posts = ''
  replieshidden = 0
  op_id = 0
  op_key = None
  posts_in_thread = 0

class BaseRequestHandler(webapp.RequestHandler):
  """Supplies a common template generation function.

  When you call generate(), we augment the template variables supplied with
  the current user in the 'user' variable and the current webapp request
  in the 'request' variable.
  """
  def generate(self, template_name, template_values={}, doreturn=False):
    account_greeting = ''
    loggedin = False
    
    user = users.get_current_user()
    if user:
      loggedin = True
      account_greeting = 'Welcome, ' + user.nickname() + '<br>'
      url = users.create_logout_url(self.request.uri)
      url_linktext = 'Log out'
    else:
      account_greeting = 'You may post anonymously,<br>or '
      url = users.create_login_url(self.request.uri)
      url_linktext = 'Log in'

    # 'administrator': users.is_current_user_admin(),
    values = {
      'request': self.request,
      'user': users.GetCurrentUser(),
      'account_url_pretext': account_greeting,
      'account_url': url,
      'account_url_linktext': url_linktext,
      'loggedin': loggedin,
      'administrator': False,
      'application_name': 'PyTXT',
    }
    values.update(template_values)
    
    directory = os.path.dirname(__file__)
    path = os.path.join(directory, os.path.join('templates', template_name))

    if doreturn:
      return template.render(path, values, debug=_DEBUG)
    else:
      self.response.out.write(template.render(path, values, debug=_DEBUG))

class MainPage(BaseRequestHandler):
  def get(self):
    """board = Board()
    board.directory = 'p'
    board.description = 'PyTXT comments and suggestions'
    board.name = 'PyTXT'
    board.put()"""
    template_values = {
      'boards': Board.all().order('directory')
    }
  
    self.generate('index.html', template_values)

class ResPage(BaseRequestHandler):
  def get(self, board, thread='', action=None):
    global _BOARD
    _BOARD = getBoard(board)
    
    if not action:
      if thread == '':
        fetchpage(self, 'front')
      else:
        fetchpage(self, thread)
    else:
      threads = getposts(thread, 0, action)
      writepage(self, threads, thread)

class SubBack(BaseRequestHandler):
  def get(self, board):
    global _BOARD
    _BOARD = getBoard(board)
    
    threadlist = getthreadlist(self, True)
    
    template_values = {
      'board': _BOARD.directory,
      'threadlist': threadlist,
    }
  
    self.generate('subback.html', template_values)

class PostToBoard(BaseRequestHandler):
  def post(self):
    global _BOARD
    parent_post = None

    _BOARD = getBoard(self.request.get('board'))
    
    request_parent = self.request.get('parent')
    if request_parent:
      post_ancestor = Post.get(request_parent)
      # Make sure we are replying to a post starting a thread, not a reply
      if post_ancestor.parent:
        if post_ancestor.board == _BOARD.directory:
          parent_post = post_ancestor
        else:
          raise Exception, 'Invalid parent'
      else:
        raise Exception, 'Invalid parent'
    
    if parent_post:
       post = Post(parent=parent_post)
       post.parentid = parent_post.key().id()
       post.posts = None
    else:
       post = Post()
       post.parentid = None
       post.posts = 1

    post.board = _BOARD.directory
    
    post.email    = cgi.escape(self.request.get('email')).strip()
    post.subject  = cgi.escape(self.request.get('subject')).strip()
    post.message  = cgi.escape(self.request.get('message')).strip()[0:1000].replace("\n", '<br>')
    post.password = cgi.escape(self.request.get('password')).strip()
    post.ip       = str(self.request.remote_addr)

    if users.get_current_user():
      current_user = users.get_current_user()
      user_prefs = UserPrefs().all().filter('user = ', current_user)
      user_prefs = user_prefs.get()
      if not user_prefs:
        user_prefs = UserPrefs(user=current_user)
        user_prefs.posts = 0
      
      post.author = current_user
    
    if parent_post:
      post.subject = ''
    else:
      if post.subject == '':
        raise Exception, 'Please input a subject.'

    if post.message == '':
      raise Exception, 'Please input a message.'
    
    if post.password:
      post.password = sha224(post.password).hexdigest()
    else:
      post.password = ''

    post.deleted = False
    
    post.put()
    post.date_formatted = post.date.strftime("%y/%m/%d %H:%M:%S")
    post.put()

    if users.get_current_user():
      user_prefs.posts += 1
      user_prefs.put()
    
    if parent_post:
      threadupdated(self, request_parent)
      parent_post.posts += 1
      if post.email.lower() != 'sage':
        parent_post.bumped = datetime.now()
      parent_post.put()
    else:
      threadupdated(self, None)
      
    if parent_post:
      self.redirect('/' + _BOARD.directory + '/' + request_parent + '/l50')
    else:
      self.redirect('/' + _BOARD.directory + '/')

class AdminPage(BaseRequestHandler):
  def get(self,arg1=None,arg2=None,arg3=None):
    page_text = ''
    if not users.is_current_user_admin():
      raise Exception, 'You are not authorized to view this page.'
    
    if arg1:
      if arg1 == 'delete_thread':
        posts = Post.all().ancestor(Post.get(arg2))
        for post in posts:
          post.delete()
        page_text += '<h3>Thread removed</h3>'
      else:
        if arg1 == 'delete_post':
          posts = Post.all().ancestor(Post.get(arg2))
          for post in posts:
            if str(post.key()) == arg3:
              post.deleted = True
              post.put()
              page_text += '<h3>Post removed</h3>'
    
    template_values = {
      'page_text': page_text,
      'administrator': users.is_current_user_admin(),
    }
    
    self.generate('admin.html', template_values)

def getposts(thread_op=None,startat=0,special=None):
  global total_threads, _BOARD
  threads = []
  posts = []
  
  if thread_op:
    thread_entity = Post.get(thread_op)
    if not thread_entity:
      raise Exception, 'Invalid thread ID supplied.'
    else:
      if thread_entity.board != _BOARD.directory:
        raise Exception, 'Invalid thread ID supplied.'
    thread = Post.all().ancestor(thread_entity).order('date')
    firstid = 1
    offset = 0

    if special and special != '':
      if special == 'l50':
        numposts = thread.count()
        offset = max(0, (numposts - 50))
        thread = thread.fetch(50, offset)
        firstid = (offset + 1)
      else:
        if special == '-100':
          thread = thread.fetch(100)
        #else:
        #  raise Exception, 'Invalid operation supplied through URL.'

    if offset > 0:
      thread_entity.relid = 1
      posts.append(thread_entity)

    # Iterate through the posts and give them their relative IDs
    i = firstid
    for post in thread:
      post.relid = i
      posts.append(post)
      i += 1

    fullthread = Thread()
    fullthread.posts = posts
    fullthread.op_key = thread_entity.key()
    fullthread.op_id = thread_entity.key().id()
    
    threads.append(fullthread)
      
  else:
    total_threads = Post.all()
    total_threads = total_threads.count()

    op_posts = Post.all().filter('parentid = ', None).filter('board = ', _BOARD.directory).order('-bumped')
    op_posts = op_posts.fetch(THREADS_SHOWN_ON_FRONT_PAGE)

    thread_relid = 1
    for thread_parent in op_posts:
      fullthread = Thread()
      
      posts_total = Post.all().ancestor(thread_parent)
      numposts = posts_total.count()
      fullthread.posts_in_thread = numposts
  
      offset = max((numposts - REPLIES_SHOWN_ON_FRONT_PAGE), 0)
      if offset > 0:
        # Because we aren't showing all of the posts, we need to display the original post first
        thread_starting_post = Post.all().ancestor(thread_parent).order('date')
        thread_starting_post = thread_starting_post.get()
        thread_starting_post.relid = 1
        posts.append(thread_starting_post)
        fullthread.op_id = thread_starting_post.key().id()
        fullthread.op_key = thread_starting_post.key()

      thread = Post.all().ancestor(thread_parent).order('date').fetch(REPLIES_SHOWN_ON_FRONT_PAGE, offset)
      
      # Iterate through the posts and give them their relative IDs
      i = (offset + 1)
      n = 1
      for post in thread:
        if i == 1:
          fullthread.op_id = post.key().id()
          fullthread.op_key = post.key()
        post.relid = i
        posts.append(post)
        i += 1
        
      fullthread.posts = posts
      fullthread.relid = thread_relid
      if thread_relid == 1:
        fullthread.navlinks = '<a href="#15">&uarr;</a>&nbsp;<a href="#2">&darr;</a>'
      else:
        if thread_relid == 15:
          fullthread.navlinks = '<a href="#14">&uarr;</a>&nbsp;<a href="#1">&darr;</a>'
        else:
          fullthread.navlinks = '<a href="#' + str(thread_relid - 1) + '">&uarr;</a>&nbsp;<a href="#' + str(thread_relid + 1) + '">&darr;</a>'
          
      if numposts > 0:
        replieshidden = (numposts - min(len(thread), REPLIES_SHOWN_ON_FRONT_PAGE))
        if replieshidden > 0:
          fullthread.replieshidden = replieshidden
      else:
        fullthread.replieshidden = None
      
      threads.append(fullthread)
      posts = []
      thread_relid += 1
  
  return threads

def getthreadlist(self, full=False):
  global _BOARD
  threadlist = ''

  threadlist_threads = Post.all().filter('parentid = ', None).filter('board = ', _BOARD.directory).order('-bumped')
  if not full:
    threadlist_threads = threadlist_threads.fetch(THREADS_SHOWN_ON_THREAD_LIST)
  
  i = 1
  for thread in threadlist_threads:
    if not full and i <= THREADS_SHOWN_ON_FRONT_PAGE:
      threadlist += '<a href="#' + str(i) + '">' + str(i) + ':</a> <a href="/' + _BOARD.directory + '/' + str(thread.key()) + '/l50">'
    else:
      threadlist += '<a href="/' + _BOARD.directory + '/' + str(thread.key()) + '/l50">' + str(i) + ': '
    threadlist += thread.subject + ' (' + str(thread.posts) + ')</a> '
    i += 1

  return threadlist

def writepage(self, threads, reply_to=None, doreturn=False):
  global time_start, total_threads, _BOARD
  
  execution_time = (datetime.now() - time_start)
  pages_text = ''
  threadlist = getthreadlist(self)
  
  if reply_to is None:
    pages = (((total_threads - 1) / 10) + 1)
    pages_text = pages_text + '[<a href="/">0</a>] '
    for i in range(1, pages):
      pages_text = pages_text + '[<a href="/?page=' + str(i) + '">' + str(i) + '</a>] '

  template_values = {
    'board': _BOARD.directory,
    'board_name': _BOARD.name,
    'board_desc': _BOARD.description,
    'threads': threads,
    'replythread': reply_to,
    'threadlist': threadlist,
    'pages': pages_text,
    'execution_time_seconds': execution_time.seconds,
    'execution_time_microseconds': (execution_time.microseconds / 1000),
    }
  
  return self.generate('board.html', template_values, doreturn)

def fetchpage(self, page_name):
  global _BOARD
  
  if page_name == 'front':
    page = Page.all().filter('identifier = ', page_name).filter('board = ', _BOARD.directory).get()
    if page:
      page_contents = page.contents
    else:
      page_contents = recachepage(self, page_name)
  else:
    page = Page.all().filter('identifier = ', page_name).filter('board = ', _BOARD.directory).get()
    if page:
      page_contents = page.contents
    else:
      page_contents = recachepage(self, page_name)

  self.response.out.write(page_contents)

def recachepage(self, page_name):
  global _BOARD
  
  if page_name == 'front':
    page = Page.all().filter('identifier = ', page_name).filter('board = ', _BOARD.directory).get()
    if not page:
      page = Page(identifier=page_name,board=_BOARD.directory)
      
    threads = getposts(None, 0)
    page_contents = writepage(self, threads, None, True)
    #page.contents = zlib.compress(page_contents, 1)
    page.contents = page_contents
    page.put()
  else:
    page = Page.all().filter('identifier = ', page_name).filter('board = ', _BOARD.directory).get()
    if not page:
      page = Page(identifier=page_name,board=_BOARD.directory)
    
    threads = getposts(page_name, 0)
    page_contents = writepage(self, threads, page_name, True)
    #page.contents = zlib.compress(page_contents, 1)
    page.contents = page_contents
    page.put()

  return page_contents

def threadupdated(self, threadid=None):
  recachepage(self, 'front')
  if threadid:
    post = Post.get(threadid)
    if post:
      recachepage(self, threadid)

def clearpage(self, page_name):
  page = Page.all().filter('identifier = ', page_name).filter('board = ', _BOARD.directory).get()
  if page:
    page.delete()
    
def tripcode(pw):
    pw = pw.encode('sjis', 'ignore')	\
        .replace('"', '&quot;')		\
        .replace("'", '\'')		\
        .replace('<', '&lt;')		\
        .replace('>', '&gt;')		\
        .replace(',', ',')
    salt = re.sub(r'[^\.-z]', '.', (pw + 'H..')[1:3])
    salt = salt.translate(string.maketrans(r':;=?@[\]^_`', 'ABDFGabcdef'))
    
    return crypt(pw, salt, None)[-10:]

def getBoard(boardname):
  board = None
  if boardname:
    board = Board.all().filter('directory = ', boardname).get()

  if not board:
    raise Exception, 'Invalid board supplied.'

  return board

def real_main():
  global time_start
  time_start = datetime.now()
  application = webapp.WSGIApplication([('/', MainPage),
                                        ('/(.*)/subback', SubBack),
                                        ('/post', PostToBoard),
                                        (r'/admin/(.*)/([0-9]+)/([0-9]+)', AdminPage),
                                        (r'/admin/(.*)/([0-9]+)', AdminPage),
                                        (r'/admin/(.*)', AdminPage),
                                        ('/admin', AdminPage),
                                        (r'/(.*)/(.*)/(.*)', ResPage),
                                        (r'/(.*)/(.*)', ResPage),
                                        (r'/(.*)', ResPage)],
                                        debug=True)
  wsgiref.handlers.CGIHandler().run(application)

def profile_main():
  import cProfile, pstats
  
  prof = cProfile.Profile()
  prof = prof.runctx("real_main()", globals(), locals())
  print "<pre>"
  stats = pstats.Stats(prof)
  stats.sort_stats("time")  # Or cumulative
  stats.print_stats(500)
  # stats.print_callees()
  # stats.print_callers()
  print "</pre>"

if __name__ == "__main__":
  #profile_main()
  # + {{ execution_time_seconds }}.{{ execution_time_microseconds }}s 
  real_main()
