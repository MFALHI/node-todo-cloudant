var dbCredentials = {
	dbName: 'todo-demo'
};

var cloudant;	

function initDBConnection() {
	if(process.env.VCAP_SERVICES) {
		var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
		// Pattern match to find the first instance of a Cloudant service in
		// VCAP_SERVICES. If you know your service key, you can access the
		// service credentials directly by using the vcapServices object.
		for(var vcapService in vcapServices){
			if(vcapService.match(/cloudant/i)){
				dbCredentials.host = vcapServices[vcapService][0].credentials.host;
				dbCredentials.port = vcapServices[vcapService][0].credentials.port;
				dbCredentials.user = vcapServices[vcapService][0].credentials.username;
				dbCredentials.password = vcapServices[vcapService][0].credentials.password;
				dbCredentials.url = vcapServices[vcapService][0].credentials.url;
				
				cloudant = require('cloudant')(dbCredentials.url);
				
				// check if DB exists if not create
				cloudant.db.create(dbCredentials.dbName, function (err, res) {
					if (err) { 
						console.log('could not create db ', err); 
					}
				});
				
				db = cloudant.use(dbCredentials.dbName);
				console.log('SUCCESS creation of the DB');
				break;
			}
		}
		if(db==null){
			console.warn('Could not find Cloudant credentials in VCAP_SERVICES environment variable - data will be unavailable to the UI');
		}
	} else{
		console.warn('VCAP_SERVICES environment variable not set - data will be unavailable to the UI');
		dbCredentials.host = "";
		dbCredentials.port = 443;
		dbCredentials.user = "";
		dbCredentials.password = "";
		dbCredentials.url = "";
		cloudant = require('cloudant')(dbCredentials.url);
				
		// check if DB exists if not create
		cloudant.db.create(dbCredentials.dbName, function (err, res) {
			if (err) { 
				console.log('could not create db ', err); 
			}
		});
			
		db = cloudant.use(dbCredentials.dbName);
		console.log('SUCCESS creation of the DB');
	}
}

initDBConnection();

function getTodos(res){
	var result =[];
	var i=0;

	db.list(function(err,todos){
		if (err){res.send(err);}
				
		var len = todos.rows.length;
		if (len === 0) {res.send(result);}
		todos.rows.forEach(function(todo){
			db.get(todo.id, function(err,data){
				if (err){res.send(err)}
				result.push(data);
				i++;

				if(i >= len){res.send(result);}
					
			});
		});			
	});
}



module.exports = function(app) {

	// api ---------------------------------------------------------------------
	// get all todos
	app.get('/api/todos', function(req, res) {
		// use cloudant to get all todos in the database
		getTodos(res);
	});

	// create todo and send back all todos after creation
	app.post('/api/todos', function(req, res) {

		// create a todo, information comes from AJAX request from Angular
		var todo = {
			text: req.body.text,
			done: false
		};

		db.insert(todo, function(err,body,header){
			if(err){
				res.send(err);
			}
			// get and return all the todos after you create another
			getTodos(res);
		});
	
	});

	// delete a todo
	app.delete('/api/todos/:todo_id', function(req, res) {
		db.get(req.params.todo_id, function(err,data){
			if (err) {res.send(err);}
			//console.log(JSON.stringify(data));
			db.destroy(data._id, data._rev, function(err,data){
				if(err){res.send(err);}
				// get and return all the todos after you create another
				getTodos(res);
			});	
		});
	});

	// application -------------------------------------------------------------
	app.get('*', function(req, res) {
		res.sendfile('./public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
	});
};