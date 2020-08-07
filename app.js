var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "123456"));
var session = driver.session();

// Home Route
app.get('/',function(req, res){
    session
        .run("MATCH (n:Person) RETURN n")
        .then(function(result){
            var personArr = [];
            
            result.records.forEach(function(record){
                //console.log(record._fields[0]);
                personArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            });
            
            session
                .run("MATCH (n:Location) RETURN n")              
                .then(function(result2){
                    var locationArr = [];
                    result2.records.forEach(function(record){
                        locationArr.push(record._fields[0].properties);
                    });
                    
                    res.render('index', {
                        persons: personArr,
                        locations: locationArr
                    });
                })
                   
        })
        .catch(function(error){
            console.log(error);
        });
});

// Add Person Route
app.post('/person/add', function(req, res){
    var name = req.body.name;
    
    session
        .run("CREATE(n:Person {name:$nameParam}) RETURN n.name", {nameParam: name})
        .then(function(result){
            res.redirect('/');
            // session.close();
        })
        .catch(function(error){
            console.log(error);
        });
});



// Add Location Route
app.post('/location/add', function(req, res){
    var city = req.body.city;
    var state = req.body.state;
    
    session
        .run("CREATE(n:Location {city:$cityParam, state:$stateParam}) RETURN n", {cityParam: city, stateParam:state})
        .then(function(result){
            res.redirect('/');
            // session.close();
        })
        .catch(function(error){
            console.log(error);
        });
});

// Friends Connect Route
app.post('/friends/connect', function(req, res){
    var name1 = req.body.name1;
    var name2 = req.body.name2;
    var id = req.body.id;
    
    session
        .run("MATCH(a:Person {name:$nameParam1}),(b:Person {name:$nameParam2}) MERGE(a)-[r:FRIENDS]->(b) RETURN a,b", {nameParam1: name1, nameParam2:name2})
        .then(function(result){
            if(id && id != null){
                res.redirect('/person/'+id);
            } else{
                res.redirect('/');
            }
            // session.close();
        })
        .catch(function(error){
            console.log(error);
        });
});

// Add Birthplace Route
app.post('/person/born/add', function(req, res){
    var name = req.body.name;
    var city = req.body.city;
    var state = req.body.state;
    var year = req.body.year;
    var id = req.body.id;
    
    session
        .run("MATCH(a:Person {name:$nameParam}),(b:Location {city:$cityParam, state:$stateParam}) MERGE(a)-[r:BORN_IN {year:$yearParam}]->(b) RETURN a,b", {nameParam: name, cityParam:city, stateParam:state,yearParam:year})
        .then(function(result){
            if(id && id != null){
                res.redirect('/person/'+id);
            } else{
                res.redirect('/');
            }
            // session.close();
        })
        .catch(function(error){
            console.log(error);
        });
});


// Delete Person Route
app.post('/person/delete', function(req, res){
    // var name = req.body.dname;

    
    session
        .run("MATCH(n:Person{name:$no}) DELETE n", { no: req.body.dname })
        .then(function(result){
            res.redirect('/');
            // session.close();
        })
        .catch(function(error){
            console.log(error);
        });
});

// Delete Location Route
app.post('/location/delete', function(req, res){

    session
        .run("MATCH(n: Location{city:$ci}) DELETE n", { ci: req.body.delocation})
        .then(function(result){
            res.redirect('/');
        })
        .catch(function(error){
            console.log(error);
        });
})

// Person Route
app.get('/person/:id', function(req, res){
    var id = req.params.id;
    
    session
        .run("MATCH(a:Person) WHERE id(a)=toInteger($idParam) RETURN a.name as name", {idParam:id})
        .then(function(result){
            var name = result.records[0].get("name");
            
            session
                .run("OPTIONAL MATCH (a:Person)-[r:BORN_IN]-(b:Location) WHERE id(a)=toInteger($idParam) RETURN b.city as city, b.state as state", {idParam:id})
                .then(function(result2){
                    var city = result2.records[0].get("city");
                    var state = result2.records[0].get("state");
                    
                    session
                        .run("OPTIONAL MATCH (a:Person)-[r:FRIENDS]-(b:Person) WHERE id(a)=toInteger($idParam) RETURN b", {idParam:id})
                        .then(function(result3){
                            var friendsArr = [];
                            
                            result3.records.forEach(function(record){
                                if(record._fields[0] != null){
                                    friendsArr.push({
                                        id: record._fields[0].identity.low,
                                        name: record._fields[0].properties.name
                                    });
                                }
                            });
                            
                            res.render('person',{
                                id:id,
                                name:name,
                                city:city,
                                state: state,
                                friends:friendsArr
                            });
                            
                            // session.close();
                        })
                        .catch(function(error){
                            console.log(error);
                        });
                });
        });
});

app.listen(3000);

console.log('Server started on port 3000');

module.exports = app;