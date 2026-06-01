import os

MYSQL_HOST     = os.environ.get('MYSQLHOST', 'localhost')
MYSQL_USER     = os.environ.get('MYSQLUSER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQLPASSWORD', 'admin123')
MYSQL_DB       = os.environ.get('MYSQLDATABASE', 'monthsary_db')
SECRET_KEY     = os.environ.get('SECRET_KEY', 'monthsary_justin_madea')
UPLOAD_FOLDER  = 'static/uploads'
MAX_CONTENT_LENGTH = 100 * 1024 * 1024
