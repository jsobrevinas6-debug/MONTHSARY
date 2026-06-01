from flask import Flask, render_template, request, redirect, session, url_for
from flask_mysqldb import MySQL
from datetime import date as date_type
import os, uuid
from werkzeug.utils import secure_filename
import config

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config['MYSQL_HOST'] = config.MYSQL_HOST
app.config['MYSQL_USER'] = config.MYSQL_USER
app.config['MYSQL_PASSWORD'] = config.MYSQL_PASSWORD
app.config['MYSQL_DB'] = config.MYSQL_DB
app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH
mysql = MySQL(app)

ALLOWED_EXTENSIONS = {'png','jpg','jpeg','gif','mp4','mov','webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ── Front page ──
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        date = request.form['anniversary_date']
        session['anniversary_date'] = date
        return redirect(url_for('home'))
    return render_template('index.html')

# ── Home / counter page ──
@app.route('/home')
def home():
    if 'anniversary_date' not in session:
        return redirect(url_for('index'))

    start = date_type.fromisoformat(session['anniversary_date'])
    today = date_type.today()

    months = (today.year - start.year) * 12 + (today.month - start.month)
    if today.day < start.day:
        months -= 1
    if months < 0:
        months = 0

    def ordinal(n):
        s = ['th','st','nd','rd']
        v = n % 100
        return str(n) + (s[(v-20)%10] if (v-20)%10 < 4 else s[v] if v < 4 else s[0])

    start_str = start.strftime('%B %d, %Y')

    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM memories ORDER BY monthsary_number ASC")
    memories = cur.fetchall()
    cur.close()

    return render_template('home.html',
                           anniversary_date=session['anniversary_date'],
                           start_date=start_str,
                           months=months,
                           ordinal=ordinal(months),
                           memories=memories)

# ── Add a new memory ──
@app.route('/add-memory', methods=['GET', 'POST'])
def add_memory():
    if request.method == 'POST':
        title = request.form['title']
        number = request.form['monthsary_number']
        date = request.form['date']
        caption = request.form['caption']
        cur = mysql.connection.cursor()
        cur.execute("INSERT INTO memories (title, monthsary_number, date, caption) VALUES (%s, %s, %s, %s)",
                    (title, number, date, caption))
        memory_id = cur.lastrowid

        files = request.files.getlist('files')
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        for file in files:
            if file and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = str(uuid.uuid4()) + '.' + ext
                file_type = 'video' if ext in {'mp4','mov','webm'} else 'photo'
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(save_path)
                cur.execute("INSERT INTO media (memory_id, filename, file_type, uploaded_by) VALUES (%s, %s, %s, %s)",
                            (memory_id, filename, file_type, 'Justin'))

        mysql.connection.commit()
        cur.close()
        return redirect(url_for('home'))
    return render_template('add_memory.html')

# ── View a single memory ──
@app.route('/memory/<int:memory_id>')
def memory(memory_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM memories WHERE id = %s", (memory_id,))
    mem = cur.fetchone()
    cur.execute("SELECT * FROM media WHERE memory_id = %s ORDER BY uploaded_at DESC", (memory_id,))
    media = cur.fetchall()
    cur.close()
    return render_template('memory.html', memory=mem, media=media)

# ── Upload photo/video to a memory ──
@app.route('/upload/<int:memory_id>', methods=['POST'])
def upload(memory_id):
    uploaded_by = request.form.get('uploaded_by', 'Justin')
    files = request.files.getlist('files')
    for file in files:
        if file and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = str(uuid.uuid4()) + '.' + ext
            file_type = 'video' if ext in {'mp4','mov','webm'} else 'photo'
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(save_path)
            cur = mysql.connection.cursor()
            cur.execute("INSERT INTO media (memory_id, filename, file_type, uploaded_by) VALUES (%s, %s, %s, %s)",
                        (memory_id, filename, file_type, uploaded_by))
            mysql.connection.commit()
            cur.close()
    return redirect(url_for('memory', memory_id=memory_id))

# ── Delete a memory ──
@app.route('/delete-memory/<int:memory_id>')
def delete_memory(memory_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT filename FROM media WHERE memory_id = %s", (memory_id,))
    files = cur.fetchall()
    for row in files:
        path = os.path.join(app.config['UPLOAD_FOLDER'], row[0])
        if os.path.exists(path):
            os.remove(path)
    cur.execute("DELETE FROM media WHERE memory_id = %s", (memory_id,))
    cur.execute("DELETE FROM memories WHERE id = %s", (memory_id,))
    mysql.connection.commit()
    cur.close()
    return redirect(url_for('home'))

# ── Edit a memory ──
@app.route('/edit-memory/<int:memory_id>', methods=['GET', 'POST'])
def edit_memory(memory_id):
    cur = mysql.connection.cursor()
    if request.method == 'POST':
        title = request.form['title']
        number = request.form['monthsary_number']
        date = request.form['date']
        caption = request.form['caption']
        cur.execute("UPDATE memories SET title=%s, monthsary_number=%s, date=%s, caption=%s WHERE id=%s",
                    (title, number, date, caption, memory_id))
        mysql.connection.commit()
        cur.close()
        return redirect(url_for('home'))
    cur.execute("SELECT * FROM memories WHERE id = %s", (memory_id,))
    mem = cur.fetchone()
    cur.close()
    return render_template('edit_memory.html', memory=mem)

# ── Delete a media item ──
@app.route('/delete-media/<int:media_id>/<int:memory_id>')
def delete_media(media_id, memory_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT filename FROM media WHERE id = %s", (media_id,))
    row = cur.fetchone()
    if row:
        path = os.path.join(app.config['UPLOAD_FOLDER'], row[0])
        if os.path.exists(path):
            os.remove(path)
        cur.execute("DELETE FROM media WHERE id = %s", (media_id,))
        mysql.connection.commit()
    cur.close()
    return redirect(url_for('memory', memory_id=memory_id))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
