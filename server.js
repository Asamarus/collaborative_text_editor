const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const app = express();
const PORT = 3333;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let editorContent = {
	blocks: [],
	entityMap: {},
};

let userSelections = {};

function getUniqueID() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4();
}

function generateRandomColor() {
	const r = Math.floor(Math.random() * 256);
	const g = Math.floor(Math.random() * 256);
	const b = Math.floor(Math.random() * 256);

	const hexR = r.toString(16).padStart(2, '0');
	const hexG = g.toString(16).padStart(2, '0');
	const hexB = b.toString(16).padStart(2, '0');

	return `#${hexR}${hexG}${hexB}`;
}

function broadcastMessage({ ws, message, excludeClientId }) {
	wss.clients.forEach(function each(client) {
		if (
			client !== ws &&
			client.readyState === WebSocket.OPEN &&
			client.id !== excludeClientId
		) {
			client.send(JSON.stringify(message));
		}
	});
}

wss.on('connection', function connection(ws) {
	ws.id = getUniqueID();
	ws.color = generateRandomColor();
	ws.send(
		JSON.stringify({
			type: 'init',
			newEditorContent: editorContent,
			selections: userSelections,
			userId: ws.id,
		}),
	);

	ws.on('message', function incoming(data) {
		const message = JSON.parse(data);
		if (message.type === 'new_content') {
			let { newEditorContent } = message;

			editorContent = newEditorContent;
			broadcastMessage({
				ws,
				message: { type: 'new_content', newEditorContent },
				excludeClientId: ws.id,
			});
		} else if (message.type === 'new_selections') {
			let { selections } = message;

			userSelections[ws.id] = {
				color: ws.color,
				selections,
			};
			broadcastMessage({
				ws,
				message: { type: 'new_selections', selections: userSelections },
				excludeClientId: ws.id,
			});
		} else if (message.type === 'clear_selection') {
			const { [ws.id]: valueToRemove, ...newUserSelections } = userSelections;
			userSelections = newUserSelections;

			broadcastMessage({
				ws,
				message: { type: 'new_selections', selections: userSelections },
				excludeClientId: ws.id,
			});
		}
	});

	ws.on('close', function () {
		const { [ws.id]: valueToRemove, ...newUserSelections } = userSelections;
		userSelections = newUserSelections;

		broadcastMessage({
			ws,
			message: { type: 'new_selections', selections: userSelections },
			excludeClientId: ws.id,
		});
	});
});

server.listen(PORT, () => {
	console.log(`listening on http://localhost:${PORT}`);
});
