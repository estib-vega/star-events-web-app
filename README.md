# star-events-web-app
small web app for storing and managing astronomical events

This is a fullstack node.js web application for the creation, edtion, 
and deletion of events for astronomical sightings.

IN ORDER FOR IT TO WORK YOU NEED TO START A MYSQL SERVER LOCALLY AND CONFIGURE IT IN THE INDEX.JS
YOU CAN FIND THE DB STATEMENTS IN THE REPOSITORY

For the persistency it uses MySQL.
The database is called 'db_prjekt' and contains the tables:
- event_entries
- event_objects

event_entries has the columns:
- EventId
- EventLoc
- EventDate

event_objects has the columns:
- EventObjId
- EventId (Foreign Key)
- Description

The front end is rendered from a EJS file, containing the list of entries and an editor.
The list is paginated according to the initial window size.

The edition, creation and deletion of the entries triggers asyncronous functions for get, post, delete and put requests,
that in turn, reload the list without reloading the entire page.
These requests are received by the server and then processes and responds accordingly as an API.
