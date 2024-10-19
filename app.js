var express = require('express');
var app = express();
var session = require('express-session');
var conn = require('./dbconfig');
const bcrypt = require('bcrypt'); // bcrypt 모듈 가져오기

app.set('view engine', 'ejs');
app.use(session({
    secret: 'yoursecrete',
    resave: true,
    saveUninitialized: true
}));
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    res.render("home");
});

app.get('/mainhome', function (req, res) {
    res.render("mainhome")
});

app.get('/login', function (req, res) {
    res.render("login");
});

app.post('/auth', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    if (username && password) {
        conn.query('SELECT * FROM users WHERE username = ?', [username], function (error, results) {
            if (error) {
                console.error('Database query error:', error);
                return res.status(500).send('An error occurred');
            }

            if (results.length > 0) {
                const user = results[0];
                bcrypt.compare(password, user.password, function (err, result) {
                    if (result) {
                        req.session.loggedin = true;
                        req.session.username = username;
                        res.redirect('/youinmember'); // 로그인 후 멤버 페이지로 이동
                    } else {
                        res.send('Incorrect Username and/or Password!');
                    }
                });
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    } else {
        res.send('Please enter Username and Password!');
    }
});

app.get('/youinmember', function (req, res, next){
    console.log('Reached /youinmember route');
    if (req.session.loggedin) {
        res.render('youinmember', {username: req.session.username });
    } else {
        res.send('Please login to view this page!')
    }
});

app.get('/logout', function (req, res) {
    req.session.destroy(function(err) {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('An error occurred');
        }
        res.redirect('/');
    });
});

app.get('/member', function (req, res) {
    res.render('member');
});

app.post('/member', async function (req, res) {
    console.log('Registering user at /member:', req.body);
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.comfirmedpassword; // 대소문자 맞춤

    const member = req.body.member === 'yes' ? 1 : 0;

    if (!username || !email || !password || !confirmPassword) {
        console.error('Validation error: All fields are required!');
        return res.status(400).send('All fields are required!');
    }

    if (password !== confirmPassword) {
        console.error('Validation error: Passwords do not match!');
        return res.status(400).send('Passwords do not match!');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Hashed password:', hashedPassword);

        const sql = `INSERT INTO users (username, email, password, comfirmedpassword, member) VALUES (?, ?, ?, ?, ?)`;
        conn.query(sql, [username, email, hashedPassword, confirmPassword, member], function (err, result) {
            if (err) {
                console.error('Database error:', err.message);
                console.error('SQL Query:', sql);
                console.error('Query Parameters:', [username, email, hashedPassword, confirmPassword, member]);
                return res.status(500).send('Failed to register user');
            }
            console.log('User registered:', result);
            res.redirect('/thank-you');
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).send('Failed to register user');
    }
});

app.get('/thank-you', function (req, res) {
    res.render('thank-you');
});

app.get('/admin', function (req, res) {
    res.render('admin');
});

// 사용자 목록 페이지 표시
app.get('/admin/users', function (req, res) {
    conn.query('SELECT * FROM users', function (error, results) {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('An error occurred');
        }
        console.log('Fetched users:', results); // 사용자 목록을 로그로 확인
        res.render('admin', { users: results });
    });
});

app.get('/admin/edit/:id', function (req, res) {
    const userId = req.params.id;
    conn.query('SELECT * FROM users WHERE id = ?', [userId], function (error, results) {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('An error occurred');
        }
        console.log('Fetched user for editing:', results);
        res.render('edit', { user: results[0] });
    });
});

app.post('/admin/edit/:id', function (req, res) {
    const userId = req.params.id;
    const { username, email, member } = req.body;
    const memberStatus = member === 'yes' ? 1 : 0;

    const sql = 'UPDATE users SET username = ?, email = ?, member = ? WHERE id = ?';
    conn.query(sql, [username, email, memberStatus, userId], function (error, results) {
        if (error) {
            console.error('Database update error:', error);
            return res.status(500).send('Failed to update user');
        }
        console.log('User updated:', results);
        res.redirect('/admin/users');
    });
});

// 사용자 삭제 처리
app.get('/admin/delete/:id', function (req, res) {
    const userId = req.params.id;
    console.log('Deleting user with ID:', userId); // 디버그용 로그 추가
    conn.query('DELETE FROM users WHERE id = ?', [userId], function (error, results) {
        if (error) {
            console.error('Database delete error:', error);
            return res.status(500).send('Failed to delete user');
        }
        console.log('User deleted:', results);
        res.redirect('/admin/users'); // 슬래시를 추가해 경로 수정
    });
});

app.get('/menu', function (req, res) {
    res.render("menu");
});

app.get('/menu2', function (req, res) {
    res.render("menu2");
});

app.get('/contact', function (req, res) {
    res.render("contact");
});

app.get('/contact2', function (req, res) {
    res.render("contact2");
});

app.get('/reply', function (req, res) {
    res.render("reply");
});

app.post(['/contact', '/contact2'], function (req, res) {
    const name = req.body.name;
    const email = req.body.email;
    const message = req.body.message;

    if (!name || !email || !message) {
        return res.status(400).send('All fields are required!');
    
    }
    const sql = `INSERT INTO contactus(name,email,message) VALUES (?, ?, ?)`;
    console.log(sql);

    conn.query(sql, [name, email, message], function (err, result) {
        if (err) {
            console.error('Database error:', err);
            res.status(500).send('Failed to submit message');
            return;
        }
        console.log('Message saved:', result);
        res.redirect('/reply');
    });
});

app.get('/viewmessages', (req, res) => {
    conn.query('SELECT * FROM contactus', (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            res.status(500).send('An error occurred');
            return;
        }
        res.render('viewmessages', { messages: results });
    });
});

app.post('/deletemessage', (req, res) => {
    const messageId = req.body.id;
    const deleteQuery = 'DELETE FROM contactus WHERE id = ?';

    conn.query(deleteQuery, [messageId], (error, results) => {
        if (error) {
            console.error('Database delete error:', error); // 여기서 에러 정보를 출력합니다.
            return res.status(500).send('Error deleting message');
        }
        if (results.affectedRows === 0) {
            return res.status(404).send('Message not found'); // 삭제할 메시지를 찾지 못했을 때
        }
        console.log('Message deleted successfully:', results);
        res.redirect('/viewmessages');
    });
});

app.get('/deletemessage', function (req, res) {
    conn.query('SELECT * FROM contactus', (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            res.status(500).send('An error occurred');
            return;
        }
        res.render('deletemessage', { messages: results });
    });
});


app.get('/special-event', function (req, res) {
    res.render("special-event");
});

app.get('/aboutus', function (req, res) {
    res.render("aboutus");
});

app.get('/newsletter', function (req, res) {
    res.render("newsletter");
});

app.get('/newsletter2', function (req, res) {
    res.render("newsletter2");
});

app.get('/gallery', function (req, res) {
    res.render("gallery");

});

app.listen(4000, function () {
    console.log('Node app is running on port 4000');
});
