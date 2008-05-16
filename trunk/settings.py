class Settings(object):
  APP_NAME = 'pytxt' # App name, as displayed in the app engine panel
  
  THREADS_SHOWN_ON_THREAD_LIST = 200
  THREADS_SHOWN_ON_FRONT_PAGE = 10
  REPLIES_SHOWN_ON_FRONT_PAGE = 10
  SECONDS_BETWEEN_NEW_THREADS = 30
  SECONDS_BETWEEN_REPLIES = 10

  ANONYMOUS = 'Anonymous' # Name to display when no name is entered in the name field.  Set to an empty string to completely remove names from post display
  POST_TRIPCODE_CHARACTER = '!'
  
  # Non-editable configuration (beginning with an underscore) follows
  _ADMINISTRATOR_VIEW = False # When the script sets this to True, special administrator commands will be visible, and pages will not be retrieved from/stored in the cache
