/*
    Node.js server script
    Required node packages: express, redis, socket.io
*/
const PORT = 3000;
const HOST = 'localhost';
const ISSSL = false;

var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var express = require('express');
var app = express();
var http = require('http');
var https = require('https');
var cookies = require('cookie');
var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
  }),
  sharedsession = require("express-socket.io-session");
var cookieParser = require("cookie-parser");
var options = {
    key: fs.readFileSync(path.join(__dirname,"privatekey.key")),
    cert: fs.readFileSync(path.join(__dirname,"certificate.pem"))
};

var server = null;
if (!ISSSL){
    server = http.createServer(app);
}else{
    server = https.createServer(options,app);
}

// Attach session
app.use(session);

var logger = require("./logHelper").helper;  
logger.use(app);

logger.i("create server");  

const io = require('socket.io')(server);

// Share session with io sockets
io.use(sharedsession(session, cookieParser('secret1', { signed: true,maxAge: 24 * 60 * 60 * 1000  }),{autoSave : true}));
logger.i("listen server");  

app.get('/',function(req,res){
	res.send('<h1>It is worked!</h1>');
});

var user_socket = [];
io.on('connection', function(socket) {

	//logger.i(socket);  
    //socket.request.connection.remoteAddress
    //socket.handshake.headers['x-forwarded-for'] || socket.handshake.address

    //
	socket.broadcast.emit('whoconnected', { headers: socket.handshake.headers, time: socket.handshake.time, address: socket.handshake.address, remoteAddress: socket.request.connection.remoteAddress});

    //socket.on('message', function(msg) {
	//		logger.i(socket + msg);  
			
	//		if (socket.handshake.session.userdata){
	//			socket.broadcast.to(socket.handshake.session.userdata.token).emit('message', msg);
	//		} else {
	//		    socket.broadcast.emit('message', msg);
	//		}
    //});

    socket.on('reqwestpost', function (data) {
        
        socket.broadcast.emit('whosendpost', data);
    });

    socket.on('toserver', function (msg) {
        logger.i('toserver=>' + JSON.stringify(msg));

        socket.broadcast.emit('toserver', msg);
    });
    socket.on('toclient', function (msg) {
        logger.i('toclient=>' + JSON.stringify(msg));

        socket.broadcast.emit('toclient', msg);
    });
	socket.on('cytoscapeevent', function(obj) {

			if (socket.handshake.session.userdata){
			    socket.broadcast.to(socket.handshake.session.userdata.token).emit('cytoscape', obj);
			}
	});
    socket.on('whocommonevent', function(obj) {
        logger.i('whocommonevent=>' + JSON.stringify(obj));
			if (socket.handshake.session.userdata){
			    socket.broadcast.to(socket.handshake.session.userdata.token).emit(obj.event, obj.data);
			}
    });
    socket.on('watcher_whoonline', function() { 
        //logger.i('watcher_whoonline'+JSON.stringify(user_socket));  
        //过滤30分钟后的
        user_socket = _.filter(user_socket, function(obj){ return obj.sockets.length > 0 || ( obj.sockets.length == 0 && (Date.now() - new Date(obj.lasttime) <= 1000 * 60 * 30)); });
		socket.emit('watcher_whoonline_cb', user_socket);
			
    });
	socket.on('reload', function(obj) {
			logger.i('reload => ' + obj.code + '-' + obj.name);  
			
			if (socket.handshake.session.userdata){
			    socket.broadcast.to(socket.handshake.session.userdata.token).emit('reload', obj);
			}
    });

    //function
    var _leaveFn = function(){
        if (socket.handshake.session.userdata) {

            var exist_token = _.findWhere(user_socket, {'userid': socket.handshake.session.userdata.userid});
		
			if (exist_token){
				exist_token.sockets = _.filter(exist_token.sockets, function(obj){ return obj.time != socket.handshake.time});
			}
			//logger.i('watcher_whooffline' + JSON.stringify(user_socket));

            socket.broadcast.emit('whooffline', {userid: socket.handshake.session.userdata.userid, username: socket.handshake.session.userdata.username, address: socket.handshake.address, time: socket.handshake.time});
            socket.broadcast.emit('watcher_whoonline_cb', user_socket);
            socket.leave(socket.handshake.session.userdata.token);

			delete socket.handshake.session.userdata;
			socket.handshake.session.save();
		}
    };
    //function

    socket.on('disconnect', function() {
        logger.i("a user disconnect => " + socket.handshake.sessionID);

		_leaveFn();
    });

	socket.on('join', function (userdata) {
		
	    logger.i("join => " + JSON.stringify(userdata));
		socket.join(userdata.token);
		
		socket.handshake.session.userdata = userdata;
        socket.handshake.session.save();

        var exist_token = _.findWhere(user_socket, {'userid': userdata.userid});
		
		if (exist_token){
		    exist_token.sockets.push({time: socket.handshake.time, addr: socket.handshake.address});
            exist_token.lasttime = socket.handshake.time;
		}else{
			user_socket.push({'userid': userdata.userid, 'sockets': [{time:socket.handshake.time, addr: socket.handshake.address}], 'userdata': userdata, headers: socket.handshake.headers, lasttime: socket.handshake.time});
		}
		
        socket.broadcast.to(userdata.token).emit('joined', userdata);
        socket.broadcast.emit('whoonline', {userid: userdata.userid, username: userdata.username, address: socket.handshake.address, time: socket.handshake.time});
	});
	
	socket.on('leave', function () {
		
	    _leaveFn();
	});

    
	
	// Accept a login event with user's data
    //socket.on("login", function(userdata) {
		
    //    socket.handshake.session.userdata = userdata;
    //    socket.handshake.session.save();
		
	//	var exist_token = _.findWhere(user_socket, {'token': userdata.token});
		
	//	if (exist_token){
	//		exist_token.sockets.push(socket);
	//	}else{
	//		user_socket.push({'token': userdata.token, 'sockets': [socket]});
	//	}
		
	//	logger.i(user_socket); 
	//	logger.i("login => " + JSON.stringify(socket.handshake.sessionStore)); 
		
	//	io.emit('loged_in', JSON.stringify(userdata));
    //});
    //socket.on("logout", function(userdata) {
		
    //    if (socket.handshake.session.userdata) {
			
	//		var exist_token = _.findWhere(user_socket, {'token': userdata.token});
		
	//		if (exist_token){
	//			exist_token.sockets = _.without(exist_token.sockets, socket);
	//		}
		
    //        delete socket.handshake.session.userdata;
    //        socket.handshake.session.save();
    //    }
	//	logger.i(user_socket); 
	//	logger.i("logout => " + JSON.stringify(socket.handshake.sessionStore)); 
    //}); 
});

server.listen(PORT, function(){
	logger.i('listening on '+ HOST + ':' + PORT + ", SSL:" + ISSSL);
});
