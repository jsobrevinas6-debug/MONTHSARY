import os

# Railway MySQL plugin uses these variable names
MYSQL_HOST     = os.environ.get('MYSQLHOST') or os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_USER     = os.environ.get('MYSQLUSER') or os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQLPASSWORD') or os.environ.get('MYSQL_PASSWORD', 'admin123')
MYSQL_DB       = os.environ.get('MYSQLDATABASE') or os.environ.get('MYSQL_DATABASE', 'monthsary_db')
MYSQL_PORT     = int(os.environ.get('MYSQLPORT') or os.environ.get('MYSQL_PORT', '3306'))
SECRET_KEY     = os.environ.get('SECRET_KEY', 'monthsary_justin_madea')
UPLOAD_FOLDER  = 'static/uploads'
MAX_CONTENT_LENGTH = 100 * 1024 * 1024

# Debug logging
print(f"MySQL Config - Host: {MYSQL_HOST}, User: {MYSQL_USER}, DB: {MYSQL_DB}, Port: {MYSQL_PORT}")
