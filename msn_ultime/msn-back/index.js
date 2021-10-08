const express = require('express');
const { Socket } = require('socket.io');
const app = express();
const port = 8080;

let server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
});

const io = require("socket.io")(server, {
    cors: {
        origin: '*',
    }
});
let chaine = [{
	name: 'General',
	users: []
}];
let users = [];


io.on('connection', (socket) => {
    pseudo = global.pseudo;
    date = getDate();

    socket.on('disconnect', function() {
        console.log("Disconnected");

		if (users.length > 0) {
			let username = users.find(o => o.id === socket.id);
			if (username !== undefined) {
				global.pseudonyme = username.username;
			}
		}

		let index = users.findIndex(o => o.id === socket.id);
		if (index > -1) {
			users.splice(index, 1);
			io.emit('RECIEVE_MESSAGE', {
				channel: "General",
				author: "Système",
				message: global.pseudonyme + " s'est déconnecté."
			});
		}
    })

	if (chaine.length > 0) {
		io.emit('LIST_CHANNEL', chaine);
	}

	if (users.length > 0) {
        io.emit('LIST_USERS', users);
    }

    socket.on('JOIN_CHANNEL', function(room, username) {
		let currentRoom = socket.rooms[Object.keys(socket.rooms)[1]];
		console.log(currentRoom);
		var item = chaine.find(o => o.name === room);
		if (item == undefined) {
			io.to(socket.id).emit('RECIEVE_MESSAGE', {
				channel: "PRIVATE",
				date: date,
				author: "Système",
				message: "Navré, ce salon n'existe pas !"
			});
		} else if (currentRoom == room) {
			io.to(socket.id).emit('RECIEVE_MESSAGE', {
				channel: "PRIVATE",
				date: date,
				author: "Système",
				message: "Vous êtes déjà dans ce salon. Tapez /create pour en créer un."
			});
		} else {
			socket.leave(currentRoom);
			io.to(socket.id).emit('RECIEVE_MESSAGE', {
				channel: "PRIVATE",
				date: date,
				author: "Système",
				message: "Vous avez quitté le salon #" + currentRoom + ".",
			});
			console.log(username , 'a quitté le channel')
			io.to(currentRoom).emit('RECIEVE_MESSAGE', {
				channel: currentRoom,
				date: date,
				author: "Système",
				message: username + " a quitté le salon."
			});
			socket.join(room);
			io.to(socket.id).emit('CHANGE_CHANNEL', room);
			var user = {
				id: socket.id,
				username: username
			};
			item.users.push(user);
			io.to(room).emit('INFOS_CHANNEL', item.users.length);
			console.log('[' + socket.id + ']', 'a rejoint le salon :', room) //
			io.to(room).emit('RECIEVE_MESSAGE', {
					channel: room,
					date: date,
					author: 'Système',
					message: username + " vient de rejoindre le salon #" + room + "."
				});
			}
		}
	)
	socket.on("SEND_MESSAGE", function(data) {
        io.emit("RECIEVE_MESSAGE", data);
        console.log(data);
		console.log(socket.rooms[Object.keys(socket.rooms)[1]])
    })

    socket.on("SEND_MESSAGE_GENERAL", function(data) {
        io.to("General").emit("RECIEVE_MESSAGE", data);
        console.log(data);
		console.log(socket.rooms[Object.keys(socket.rooms)[1]])
    })

    socket.on("SEND_CHANNEL_MESSAGE",function(data,room){
        io.to(room).emit("RECIEVE_MESSAGE",data)
        console.log(data);
		console.log(socket.rooms)
    })

    socket.on("NEW_USER", function(data) {
        io.emit("NEW_USER_MESSAGE", data);
        pseudo = data.pseudo;
		socket.join("General");
		let user = {
			id: socket.id,
			username: data.pseudo
		};
		chaine.find(o => o.name === "General").users.push(user);
		users.push(user);
		io.emit('ADD_USERS', user);
    })

	socket.on("RENAME", function(data, dataNick, channel) {
		io.emit("RECIEVE_MESSAGE", data);
		let user = {
			id: socket.id,
			username: dataNick
		};
		chaine.find(o => o.name === channel).users = chaine.find(o => o.name === channel).users.filter(function(el) { return el.id != user.id; });
		users = users.filter(function(el) { return el.id != user.id });
		//console.log(chaine.find(o => o.name === channel).users);
		chaine.find(o => o.name === channel).users.push(user);
		users.push(user);
		io.emit('ADD_USERS', user);
		io.emit('LIST_USERS', users);
		global.pseudo = dataNick;
	})
    
    socket.on("CREATE_CHANNEL",function(channel){
        var item = chaine.find(o => o.name === channel);
        if(item == undefined){
            io.emit("RECIEVE_MESSAGE",{
                channel:"General",
                author:"Système",
                message: "Le nouveau salon #" + channel + " a été crée. Tapez /join " + channel + " pour le rejoindre."
            })
            var chat = {
				author_id: socket.id,
				name: channel,
				users: []
			}
			io.emit('ADD_CHANNEL', chat);
			console.log("Nouveau salon disponible : #" + channel);
			chaine.push(chat);
        }else {
			io.to(socket.id).emit('RECIEVE_MESSAGE', {
				channel: "PRIVATE",
				date: date,
				author: "Système",
				message: "Ce salon existe déjà. Tapez /join " + channel + " pour rejoindre la discussion."
			});
		}
    })
	socket.on('DELETE_CHANNEL', function(channel) {
		var index = chaine.findIndex(o => o.name === channel);
		var item = chaine.find(o => o.name === channel);
		if (item.author_id === socket.id && item) {
			if (index > -1) {
				chaine.splice(index, 1);
			}
			io.emit('LIST_CHANNEL', chaine);
		} else {
			io.to(socket.id).emit('RECIEVE_MESSAGE', {
				channel: "PRIVATE",
				author: 'Système',
				message: "Vous ne pouvez pas supprimer ce salon."
			});
		}
	})

	socket.on("LEAVE_CHANNEL",function(username, channels){
		console.log("coucou je suis dans le "+channels);	
		socket.leave(channels);
		socket.join("General");
		socket.to(channels).emit('RECIEVE_MESSAGE', {
			channel: channels,
			author: 'Système',
			message: username + " a quitté le salon #" + channels + "."
		});
	})

	socket.on("GET_CHANNEL",function(){
		var list = "";

		for(var info in chaine){
			list += "- " + chaine[info].name + " ";
		}
		if(chaine.length == 0){
			list ="Aucun";
		}
		io.to(socket.id).emit("RECIEVE_MESSAGE",{
			channel:"PRIVATE",
			author:"Système",
			message:"Salon(s) actif(s) (" + chaine.length + ") : " + list
		})
	})

	socket.on('GET_USERS', function(channel) {
		let list = "";
		let item = chaine.find(o => o.name === channel);
		let nb = 0;
		if (item !== undefined) {
			for (var info in item.users) {
				nb = item.users.length;
				let username = item.users.find(o => o.id === item.users[info].id);
				if (username !== undefined) {
					console.log(item.users[info].username);
					list += "@" + item.users[info].username + " ";
				}
			}
		} else {
			list = "Aucun";
		}
		io.emit('INFOS_CHANNEL', nb);
		io.to(socket.id).emit('RECIEVE_MESSAGE', {
			channel: 'PRIVATE',
			author: "Système",
			message: "Utilisateur(s) connecté(s) sur #" + channel + " (" + nb + ") : " + list
		});
	})

	socket.on('PRIVATE_MESSAGE', function(name, msg) {
		let sender = users.find(o => o.id === socket.id);
		let receiver = users.find(o => o.username === name);
		if (receiver !== undefined) {
			console.log(socket.id + ' envoie un mp à ' + receiver.id + ' : ' + msg);
			io.to(receiver.id).emit('RECIEVE_MESSAGE', {
				channel: "PRIVATE @" + sender.username,
				author: sender.username,
				message: ("( @" + receiver.username + " ) >> " + msg)
			});
			io.to(socket.id).emit('RECIEVE_MESSAGE', {
				channel: "PRIVATE @" + receiver.username,
				author: sender.username,
				message: ("( @" + receiver.username + " ) >> " + msg)
			});
		} else {
			io.to(socket.id).emit('RECIEVE_MESSAGE', {
				channel: "PRIVATE",
				author: 'Système',
				message: "Cet utilisateur n'existe pas ou n'est pas connecté."
			});
		}
	})

});

function getDate(){

	let now = new Date();
	let hour = now.getHours();
	let minute = now.getMinutes();
	if (hour.toString().length == 1) {
		hour = '0' + hour;
	}
	if (minute.toString().length == 1) {
		minute = '0' + minute;
	}
	return date = hour + 'h' + minute;
}
