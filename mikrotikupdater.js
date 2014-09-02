var Connection = require('ssh2');
var ping = require ("net-ping");
var sleep = require('sleep');

options = {
	networkProtocol: ping.NetworkProtocol.IPv4,
	packetSize: 16,
	retries: 10,
	sessionId: (process.pid % 65535),
	timeout: 2000,
	ttl: 128
};

session = ping.createSession (options);

target = '192.168.88.1';



pinghost = function(result) {

	session.pingHost (target, function (error, target){
		if (error){
			return false;
		}
		else{	
			return true;
		}
	});
}


function resource_print(conn){
	conn.exec('/system resource print', function(err, stream) {
		if (err){
			return false;
		}
		else{
			stream.on('data', function(data) {
				var datastring = data.toString();
				var result = {};
				console.log(datastring);
				datastring.split('\r\n').forEach(function(x){
					var arr = x.trim().split(': ');
					arr[1] && (result[arr[0]] = arr[1]);
				});
				console.log(result);
				console.log(result['uptime']);
				console.log(result['version']);
				console.log(result['architecture-name']);
				console.log(result['board-name']);
				if (result['board-name']){
					return true;
				}

			}).stderr.on('data', function(data) {
				console.log('STDERR: ' + data);
			});
		}
	});
}

while (true){
	if(pinghost()) {
		var conn = new Connection();
		conn.on('ready', function() {
			console.log('Connection :: ready');
			if(resource_print(conn)){
				if (currentarchitecture === 'mipsbe' || currentarchitecture === 'mipsle'){
					conn.sftp(function(err, sftp) {
						if (err) throw err;
						//console.log('Uploading file: routeros-' + currentarchitecture + '.npk');
						sftp.fastPut('routeros-' + currentarchitecture + '.npk','routeros-' + currentarchitecture + '.npk',function(err) {
							if (err) throw err;
							console.log('Uploading file: config-' + currentmodel + '.bak');
							sftp.fastPut('config-' + currentmodel + '.bak','config-' + currentmodel + '.bak',function(err) {
								if (err) throw err;
								console.log('Upgrading routerboard.');
								conn.exec('system reboot', function(err, stream) {
									if (err) throw err;
									stream.on('data', function(data) {
										console.log('STDOUT: ' + data);
									}).stderr.on('data', function(data) {
										console.log('STDERR: ' + data);
									});
								});
							});
						});
					});
				}else{
					//console.log('Only mipsbe and mipsle are supported right now. ' + currentarchitecture);
				}
			}
			else
			{
				sleep.sleep(2);
				console.log('Printing resources failed');
			}
		}).connect({
			host: target,
			port: 22,
			username: 'admin',
			password: ''
		});
	}
	else{
		console.log(pinghost(result));
		sleep.sleep(2);
		pinghost();
	}
}
