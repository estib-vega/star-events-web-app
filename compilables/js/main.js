const pageManager = require('./page-manager')

var editObjectCount = 1;

/** ********************************* functions **********************************/

// returns the element (less redundancy)
function DOM (id) {
    return document.getElementById(id);
}

// enable / disable the editor input fields, and optionally
// fill them with a given value
function toggleEditorInputs (disable, inDate=null, inPlace=null) {
    var day = DOM('editor_day')
    var month = DOM('editor_month')
    var year = DOM('editor_year')

    var plac = DOM('editor_place');
    if (inDate !== null) {
        if (inDate !== "") {
            const date = inDate.split('-')
            day.value = parseInt(date[2])
            month.value = parseInt(date[1])
            year.value = parseInt(date[0])
        } else {
            day.value = ""
            month.value = ""
            year.value = ""
        }
    }
    if (inPlace != null) {
        plac.value = inPlace
        plac.onchange()
    }

    day.disabled = disable;
    month.disabled = disable;
    year.disabled = disable;
    plac.disabled = disable;
    DOM('add_b').disabled = disable;
    DOM('del_b').disabled = disable;
    DOM('end_b').disabled = disable;
    DOM('can_b').disabled = disable;
    
}

// append an entry item to the entry list
// given a json data object
function appendListItem (data) {
    var list = DOM('list')
    var listItem = document.createElement("li");
    listItem.classList.add("fade-in")
    listItem.id = "entry_id_" + data.EventId
    const title = '<div class="entry-title">'
                    +'<h3>' + data.EventDate + '</h3>'
                    +'<h3>' + data.EventLoc + '</h3>'
                    +'</div>'
    var body = "";
    if (data.Objects) {
        body += "<ol>"
        data.Objects.split(',').forEach(obj => {
            body += "<li>"
            body += "<h4>" + obj + "</h4>"
            body += "</li>"
        })
        body += "</ol>"
    } else {
        body += '<h4 class="no-objects">Keine Objekte</h4>'
    }
    const button = "<button onclick=\""
    + "handler.handleEditButtonPressed(\'entry_id_" + data.EventId + "\')\">"
    + "mehr</button>"
    
    listItem.innerHTML = title + body + button

    list.appendChild(listItem)
}

// update the entry list
// get all items from API and 
// append each of them to the list
// after that, recalculate the pages
function updateList () {
    // empty out list
    var list = DOM('list')
    list.innerHTML = ""

    const data = fetch("/entry")
    .then(response => {
        return response.json()
    }).then(json => {
        json.forEach(item => {
            appendListItem(item)
        })
        // recalculate pages
        pageManager.checkHeight()
    }).catch(error => {
        console.log(error);
    });
}

// check the editor fields, 
// returns true if it's good to go, else false
function checkFields () {
    var everythingGood = true

    // date
    const year = DOM('editor_year').value
    const month = DOM('editor_month').value
    const day = DOM('editor_day').value

    if (year != null && month != null && day != null) {
        // padding with 0's
        var m = month.toString().length < 2 ? "0" + month : month
        var d = day.toString().length < 2 ? "0" + day : day

        var dateval = ""
        dateval += "" + year
        dateval += "-" + m
        dateval += "-" + d

        var date = new Date(dateval)
        const isDate = date.toString() !== "Invalid Date"

        if (!isDate) {
            DOM("editor_day").classList.add('error-field')
            DOM("editor_month").classList.add('error-field')
            DOM("editor_year").classList.add('error-field')
            everythingGood = false
            
        }

    } else {
        DOM("editor_day").classList.add('error-field')
        DOM("editor_month").classList.add('error-field')
        DOM("editor_year").classList.add('error-field')
        everythingGood = false
    }

    // place
    // only check if its not empty
    const locval = DOM("editor_place").value
    if (!locval || locval === "") {
        DOM("editor_place").classList.add('error-field')
        everythingGood = false
    }

    return everythingGood
}

// send post request using fetch post
// asynchronious await
async function postData (data) {
    // data is a json object
    const url = "/add_event";
    const response = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data),
        headers: {"Content-Type": "application/json"}
    }).then(response => { 
        return response.json()
    }).then(json => {
        // console.log(json);
        updateList()
    }).catch(error => {
        console.log(error);
    })
}
// send post request using fetch put
// asynchronious await
async function putData (data) {
    // data is a json object
    const url = "/edit_event";
    const response = await fetch(url, {
        method: 'put',
        body: JSON.stringify(data),
        headers: {"Content-Type": "application/json"}
    }).then(response => { 
        return response.json()
    }).then(json => {
        // console.log(json);
        updateList()
    }).catch(error => {
        console.log(error);
    })
   
}

// send delete request using fetch delete
// asynchronious await
async function deleteData (id) {
    const url = "/delete"
    const response = await fetch(url, {
        method: 'delete',
        body: JSON.stringify({id: id}),
        headers: {'Content-Type': "application/json"}
    }).then(response => {
        return response.json()
    }).then(json => {
        updateList()
    }).catch(error => console.log(error))
}

/** ********************************* on click handlers **********************************/

var objExport = {

    // 'mehr' button handlers
    // fill the forms in the editor
    handleEditButtonPressed: function (id) {
        this.handleCancelEditPressed(true);

        // get the info
        var elem = DOM(id)
        const objNum = elem.children[1].childElementCount

        const inDate = elem.children[0].children[0].innerHTML;
        const inPlace = elem.children[0].children[1].innerHTML;

        toggleEditorInputs(false, inDate, inPlace)

        var objs = DOM('editor_objects');

        DOM('editor_id').value = "" + id;

        // delete button
        DOM('los_b').style.display = "block";
        DOM('los_b').classList.add("fade-in")

        DOM('los_a').style.display = "block";
        DOM('los_a').classList.add("fade-in")
        
        DOM('los_c').style.display = "block";
        DOM('los_c').classList.add("fade-in")

        var inputs = "";
        const inp = '<input type="text"';

        if (objNum > 0) {
            for (var i = 0; i < objNum; i++) {
                const v = elem.children[1].children[i].children[0].innerHTML;
                const val = inp + 'value="' + v +'" id="event_obj'+ (i +1) + '">';
                inputs += val;
            }

            objs.innerHTML = inputs;
        } else {
            objs.innerHTML = inp + 'id="event_obj1">';
        }
        
        editObjectCount = objNum;
        
    },

    // editor add 1 object
    // to event object list
    handleAddObjectPressed: function () {
        const children = DOM('editor_objects').children.length;

        editObjectCount++;

        for (var i = children; i < editObjectCount; i++) {
            var input = document.createElement("input")
            input.type = "text"
            input.id = "event_obj" + (i+1)
            DOM('editor_objects').appendChild(input)
        }
    },

    // editor delete 1 object
    // from event object list
    handleDeleteObjectPressed: function () {
        if (editObjectCount === 1) {
            DOM('editor_objects').childNodes[0].value = "";
            return
        }
        var events = DOM('editor_objects');
        const lastchild = events.children.length - 1;
        events.removeChild(events.children[lastchild]);
        editObjectCount--;
    },

    // check if the fields are properly filled
    // send the post request
    handleSaveEditPressed: function () {
        // check the fields
        if (!checkFields()) {
            return
        }
        
        var date = ""
        date += "" + DOM('editor_year').value
        date += "-" + DOM('editor_month').value
        date += "-" + DOM('editor_day').value
        var plac = DOM('editor_place');
        var objs = DOM('editor_objects').childNodes;
        const ID = DOM('editor_id').value.split('_')[2];
        
        const data = {
            event_date: date,
            event_loc: plac.value,
            id: ID
        }
        objs.forEach(obj => {
            // only add field objects
            if (obj.value && obj.value !== "") {
                data[obj.id] = obj.value;
            }
        })

        // put data
        // if the id is empty, then post data
        if (data.id) {
            putData(data);
        } else {
            postData(data)
        }
        
        this.handleCancelEditPressed();
    },

    // set initial editor state
    handleCancelEditPressed: function (notoggle=false) {
        var objs = DOM('editor_objects');
        objs.innerHTML = "<input type='text' disabled>";
        
        DOM('editor_id').value = "";

        if (!notoggle) {
            toggleEditorInputs(true, "", "")
        }

        // delete button
        DOM('los_b').style.display = "none";
        DOM('los_b').classList.remove("fade-in")

        DOM('los_a').style.display = "none";
        DOM('los_a').classList.remove("fade-in")

        DOM('los_c').style.display = "none";
        DOM('los_c').classList.remove("fade-in")

        DOM('editor_place').classList.remove('error-field')
        DOM('editor_day').classList.remove('error-field')
        DOM('editor_month').classList.remove('error-field')
        DOM('editor_year').classList.remove('error-field')

    },

    // create a new entry
    handleNewEntry: function () {
        this.handleCancelEditPressed();
        DOM('los_b').style.display = "none";
        
        var objs = DOM('editor_objects');
        
        objs.innerHTML = '<input type="text" id="event_obj1">';
        
        DOM('editor_id').value = "";

        toggleEditorInputs(false, "", "");

        editObjectCount = 1;

    },

    // delete entry in the editor
    handleDeleteEntry: function () {
        const ID = DOM('editor_id').value.split('_')[2];
        if (ID) {
            deleteData(ID)
        }
        this.handleCancelEditPressed()
    },

    handlePageButton: function (isPlus) {
        pageManager.handlePageButton(isPlus)
    },

    // check for min max values for dates
    checkMinMax: function (elem) {
        const max = parseInt(elem.max)
        const min = parseInt(elem.min)
        
        if (elem.value <= max && elem.value >= min) {
            return
        }

        if (elem.value < min) {
            elem.value = min
            return
        }
        
        if (elem.value > max) {
            elem.value = max
        }
    },

    // when the place changes, then automatically change the map,
    // also change the link of the fullscreen map to the correct one
    placeChange: function (val) {
        document.getElementById('los_a_link').href='https://www.google.com/maps/search/?api=1&query='+val;
        // doSearch(val)
    },

    // show only the side being edited, and print the window
    printPage: function () {
        document.getElementById("nonPrintable").style.opacity=0;
        document.getElementById("printable").style.width = "100%";
        document.getElementById("printable").style.left = 0;
        setTimeout(function () {
            window.print();
        }, 2000);
        setTimeout(function () {
          document.getElementById("printable").style.width = "50vw";
          document.getElementById("printable").style.left = "50vw";
          document.getElementById("nonPrintable").style.opacity=1;

        }, 2500);

    }

}

module.exports = objExport
