const express = require('express') // server 
const mysql = require('mysql') // database
const app = express()
const bodyparser = require('body-parser') // post

// serve public static files (css, js)
app.use(express.static('./public'))

// decode post form
// it returns the information as json
app.use(bodyparser.urlencoded({
    extended: true
}))
app.use(bodyparser.json())

// renders the ejs templates
app.set("view engine", "ejs")

var commandPort = process.argv[2]

// port for the app to be hosted to
const prt = commandPort|| 8080

/** ************************************** functions **********************************************/

// returns a connection to the mysql database
function getConnection () {
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        database: 'db_projekt',
        password: 'Asd123@Asd456'
    })
}

// gets all the data ordered by date 
// grouping the event objects by event id
// sends the json response of renders the template
function jsonGet (res, render=false) {
    const sql = getConnection()

    let query = "SELECT e.EventDate, e.EventLoc, e.EventId, (SELECT GROUP_CONCAT(o.Description) "
            + " FROM event_objects o WHERE e.EventId = o.EventId) AS Objects"
            + " FROM event_entries e"
            + " ORDER BY e.EventDate";
    
    sql.query(query, (err, results, fields) => {
        if (err) {
            // console.log(err);
            // res.send("<h1 style='font-family: Helvetica;'>Anscheinend gibt es keine MySQL db angeschlossen, bitte konfigurieren Sie eine mithilfe von 'db_statement.txt'</h1>")
            if (!render) {
                res.json([])
            } else {
                res.render("entry", {
                    jsonResults: []
                })
            }
            return
        }

        var jsonR = []
        
        results.forEach(elem => {
            var entry = {
                EventId: elem.EventId,
                EventDate: elem.EventDate.toLocaleDateString(),
                EventLoc: elem.EventLoc,
                Objects: elem.Objects
            }
            jsonR.push(entry)
        })

        if (!render) {
            res.json(jsonR)
        } else {
            res.render("entry", {
                jsonResults: jsonR
            })
        }
        
    })
}

// add a new event entry
function addEntry (res, date, loc, listedObjs) {
    const sql = getConnection()
    const qry = "INSERT INTO event_entries (EventDate, EventLoc) VALUES (?, ?)"
    var id = -1;

    sql.query(qry, [date, loc], (err, results, fields) => {
        if (err) {
           // console.log(err);
           // res.send("<h1 style='font-family: Helvetica;'>Anscheinend gibt es keine MySQL db angeschlossen, bitte konfigurieren Sie eine mithilfe von 'db_statement.txt'</h1>")
           res.json([])
           return
        }
        id = results.insertId;

        const qry2 = "INSERT INTO event_objects (EventId, Description) VALUES (?, ?)"

        listedObjs.forEach(elem => {
            sql.query(qry2, [id, elem], (err, results, fields) => {
                if (err) {
                    console.log(err);
                    res.sendStatus(500)
                    res.end()
                    return
                }
                console.log('id of inserted obj: ' + results.insertId)
            })
        })

        res.json({msg: "added", ID: id})
    })
}

// delete an event entry and its corresponding objects
// given an id
function deleteEntry (res, id) {
    const sql = getConnection()

    const deleteQ = "DELETE FROM event_objects WHERE EventId=?"

    sql.query(deleteQ, [id], (err, results, fields) => {
        if (err) {
           // console.log(err);
           // res.send("<h1 style='font-family: Helvetica;'>Anscheinend gibt es keine MySQL db angeschlossen, bitte konfigurieren Sie eine mithilfe von 'db_statement.txt'</h1>")
           res.json([]) 
           return
        }
        const delteEntry = "DELETE FROM event_entries WHERE EventId=?"

        sql.query(delteEntry, [id], (err, results, fields) => {
            if (err) {
                console.log(err);
                res.sendStatus(500)
                res.end()
                return
            }
            res.json({msg: "deleted"})
        })
        
    })
}

// edit an entry given the attributes and an id
function editEntry (res, id, date, loc, listedObjs) {
     // update sql row
     const sql = getConnection()

     // edit event entry
     const editQ = "UPDATE event_entries SET EventDate=?, EventLoc=? WHERE EventId=?";
     sql.query(editQ, [date, loc, id], (err, results, fields) => {
         if (err) {
            // console.log(err);
            // res.send("<h1 style='font-family: Helvetica;'>Anscheinend gibt es keine MySQL db angeschlossen, bitte konfigurieren Sie eine mithilfe von 'db_statement.txt'</h1>")
            return
         }
 
         // delete all event objects with given event id 
         const deleteQ = "DELETE FROM event_objects WHERE EventId=?";
         sql.query(deleteQ, [id], (err, results, fields) => {
             if (err) {
                 console.log(err);
                 res.sendStatus(500)
                 res.end()
                 return
             }
             // create new objects
             const objsQ = "INSERT INTO event_objects (EventId, Description) VALUES (?, ?)";

             const objsNum = listedObjs.length
             var iter = 0
             listedObjs.forEach(elem => {
                 sql.query(objsQ, [id, elem], (err, results, fields) => {
                     if (err) {
                         console.log(err);
                         res.sendStatus(500)
                         res.end()
                         return
                     }
                     // assure that after the last 
                     // query returned a response 
                     // then send the json response
                     iter++;
                     if (iter === objsNum) {
                        res.json({msg: "edited"})
                     }
                 })
             })
         })
     })
}

/** ************************************** routes **********************************************/

// REST delete
app.delete("/delete", (req, res) => {
    console.log("handling delete...");
    const bResponse = req.body

    const id = bResponse.id
    deleteEntry(res, id)
    
})

// REST get
app.get("/entry", (req, res) => {
    console.log("handling get...");

    // sql query => json response
    jsonGet(res)
})

// REST put
app.put("/edit_event", (req, res) => {
    console.log('handling put...');
    const bResponse = req.body
    
    const date = bResponse.event_date
    const loc = bResponse.event_loc
    const id = bResponse.id

    var listedObjs = []

    Object.entries(bResponse).forEach(
        ([key, value]) => {
            if (key.includes('event_obj')) {
                listedObjs.push(value)
            }
        }
    );

    editEntry(res, id, date, loc, listedObjs)
 
})

// REST post
app.post("/add_event", (req, res) => {
    console.log('handling post...');
    const bResponse = req.body
    
    const date = bResponse.event_date
    const loc = bResponse.event_loc

    var listedObjs = []

    // get all event objects
    Object.entries(bResponse).forEach(
        ([key, value]) => {
            if (key.includes('event_obj')) {
                listedObjs.push(value)
            }
        }
    );

    addEntry(res, date, loc, listedObjs)
})

// returns all the event entries and their objects
app.get("/", (req, res) => {
    console.log('landing page...');

    jsonGet(res, true)
})

// start server
app.listen(prt, () => {
    console.log('Running app in port ' + prt + '...');
})
