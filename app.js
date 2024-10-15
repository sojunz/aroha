var express = require('express');
var app = express();
var session = require('express-session');
var conn = require('./dbconfig');

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
    let username = req.body.username; // name을 username으로 변경
    let password = req.body.password;
    if (username && password) {
        conn.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password],
            function (error, results) {
                if (error) {
                    console.error('Database query error:', error);
                    res.status(500).send('An error occurred');
                    return;
                }
                if (results.length > 0) {
                    req.session.loggedin = true;
                    req.session.username = username; // session에 저장할 때도 username 사용
                    res.redirect('/youinmember');
                } else {
                    res.send('Incorrect Username and/or Password');
                }
            }
        );
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

app.get('/register', function (req, res) {
    res.render('register');
});

app.post('/register', function (req, res) {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmpassword;
    const sql = `INSERT INTO register (username, email, password) VALUES (?, ?, ?)`;
    conn.query(sql, [username, email, password], function (err, result) {
        if (err) {
            console.error('Database error:', err);
            res.status(500).send('Failed to register user');
            return;
        }
        console.log('User registered:', result);
        res.redirect('/thank-you');
    });
});

app.get('/thank-you', function (req, res) {
    res.render('thank-you');
});

app.get('/logout', function (req, res) {
    req.session.destroy(function(err) {
        if (err) {
            console.error('Logout error:', err);
            res.status(500).send('An error occurred');
        } else {
            res.redirect('/');
        }
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
