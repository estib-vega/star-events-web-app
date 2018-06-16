(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.handler = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
    }

}

module.exports = objExport

},{"./page-manager":2}],2:[function(require,module,exports){
// fill the page dictionary
var currentPage;
var pages;
function fillPages (pageNum, lastIndex) {
    pages[pageNum] = lastIndex
}

// hide the correct items
function hideOtherPages () {
    const items = document.getElementById('list').children;
    const itemsNum = items.length;

    var firstOfPage = -1;
    var lastOfPage = pages[currentPage];
    
    // if previous page exists
    if (pages[currentPage-1] != null) {
        firstOfPage = pages[currentPage-1] + 1
    } else {
        firstOfPage = 0;
    }

    for (var i = 0; i < itemsNum; i++) {
        if (i < firstOfPage || i > lastOfPage) {
            items[i].style.display = "none";
        } else {
            items[i].style.display = "block";
        }
    }
}

// display number of pages and current page
function pageStatus () {
    var status = document.getElementById('page_status');
    var size = 0;
    var key;
    for (key in pages) {
        if (pages.hasOwnProperty(key)) {
            size++;
        }
    }
    
    var msg = currentPage + " of " + size;
    status.innerText = msg;
}

// display the items that fit on the window, without scrolling
function checkHeight () {
    // calc the window height to fit a maximal amount of items
    const winHei = window.innerHeight - 140;

    const listItems = document.getElementById('list').children;
    const itemsNum = listItems.length;

    var itemsHeight = 0;
    var pageNum = 1;
    
    currentPage = 1;
    pages = {};

    for (var i = 0; i < itemsNum; i++) {
        // show them all again, to be messured
        listItems[i].style.display = "block";
        var h = listItems[i].offsetHeight;
        itemsHeight += h;
        
        // if the items height is bigger than the window
        // then asign them to a different page
        if (itemsHeight >= winHei) {
            fillPages(pageNum, (i - 1));
            itemsHeight = h;
            pageNum++;
        }
        if (i === itemsNum - 1) {
            fillPages(pageNum, i);
            pageNum++;
        }

    }
    // hide items after the last item of the page
    hideOtherPages();
    // show number of pages and current one
    pageStatus();
    
}
// handle buttons next page and previous page
function handlePageButton (isPlus) {
    
    if (isPlus) {
        const next = currentPage + 1;

        if (next in pages) {
            currentPage = next;
        }
    } else {
        const prev = currentPage - 1;

        if (prev in pages) {
            currentPage = prev;
        }
    }

    hideOtherPages();
    pageStatus();
}

window.onload = function () {
    checkHeight();
}

var resizer;
window.onresize = function () {
    clearTimeout(resizer)
     resizer = this.setTimeout(() => {
        checkHeight();
    }, 200)

}

exports.checkHeight = function () {
    checkHeight()
}

exports.handlePageButton = function (isPlus) {
    handlePageButton(isPlus)
} 

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb21waWxhYmxlcy9qcy9tYWluLmpzIiwiY29tcGlsYWJsZXMvanMvcGFnZS1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiY29uc3QgcGFnZU1hbmFnZXIgPSByZXF1aXJlKCcuL3BhZ2UtbWFuYWdlcicpXG5cbnZhciBlZGl0T2JqZWN0Q291bnQgPSAxO1xuXG4vKiogKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqIGZ1bmN0aW9ucyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vLyByZXR1cm5zIHRoZSBlbGVtZW50IChsZXNzIHJlZHVuZGFuY3kpXG5mdW5jdGlvbiBET00gKGlkKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbn1cblxuLy8gZW5hYmxlIC8gZGlzYWJsZSB0aGUgZWRpdG9yIGlucHV0IGZpZWxkcywgYW5kIG9wdGlvbmFsbHlcbi8vIGZpbGwgdGhlbSB3aXRoIGEgZ2l2ZW4gdmFsdWVcbmZ1bmN0aW9uIHRvZ2dsZUVkaXRvcklucHV0cyAoZGlzYWJsZSwgaW5EYXRlPW51bGwsIGluUGxhY2U9bnVsbCkge1xuICAgIHZhciBkYXkgPSBET00oJ2VkaXRvcl9kYXknKVxuICAgIHZhciBtb250aCA9IERPTSgnZWRpdG9yX21vbnRoJylcbiAgICB2YXIgeWVhciA9IERPTSgnZWRpdG9yX3llYXInKVxuXG4gICAgdmFyIHBsYWMgPSBET00oJ2VkaXRvcl9wbGFjZScpO1xuICAgIGlmIChpbkRhdGUgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKGluRGF0ZSAhPT0gXCJcIikge1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IGluRGF0ZS5zcGxpdCgnLScpXG4gICAgICAgICAgICBkYXkudmFsdWUgPSBwYXJzZUludChkYXRlWzJdKVxuICAgICAgICAgICAgbW9udGgudmFsdWUgPSBwYXJzZUludChkYXRlWzFdKVxuICAgICAgICAgICAgeWVhci52YWx1ZSA9IHBhcnNlSW50KGRhdGVbMF0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXkudmFsdWUgPSBcIlwiXG4gICAgICAgICAgICBtb250aC52YWx1ZSA9IFwiXCJcbiAgICAgICAgICAgIHllYXIudmFsdWUgPSBcIlwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGluUGxhY2UgIT0gbnVsbCkge1xuICAgICAgICBwbGFjLnZhbHVlID0gaW5QbGFjZVxuICAgICAgICBwbGFjLm9uY2hhbmdlKClcbiAgICB9XG5cbiAgICBkYXkuZGlzYWJsZWQgPSBkaXNhYmxlO1xuICAgIG1vbnRoLmRpc2FibGVkID0gZGlzYWJsZTtcbiAgICB5ZWFyLmRpc2FibGVkID0gZGlzYWJsZTtcbiAgICBwbGFjLmRpc2FibGVkID0gZGlzYWJsZTtcbiAgICBET00oJ2FkZF9iJykuZGlzYWJsZWQgPSBkaXNhYmxlO1xuICAgIERPTSgnZGVsX2InKS5kaXNhYmxlZCA9IGRpc2FibGU7XG4gICAgRE9NKCdlbmRfYicpLmRpc2FibGVkID0gZGlzYWJsZTtcbiAgICBET00oJ2Nhbl9iJykuZGlzYWJsZWQgPSBkaXNhYmxlO1xuICAgIFxufVxuXG4vLyBhcHBlbmQgYW4gZW50cnkgaXRlbSB0byB0aGUgZW50cnkgbGlzdFxuLy8gZ2l2ZW4gYSBqc29uIGRhdGEgb2JqZWN0XG5mdW5jdGlvbiBhcHBlbmRMaXN0SXRlbSAoZGF0YSkge1xuICAgIHZhciBsaXN0ID0gRE9NKCdsaXN0JylcbiAgICB2YXIgbGlzdEl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIik7XG4gICAgbGlzdEl0ZW0uY2xhc3NMaXN0LmFkZChcImZhZGUtaW5cIilcbiAgICBsaXN0SXRlbS5pZCA9IFwiZW50cnlfaWRfXCIgKyBkYXRhLkV2ZW50SWRcbiAgICBjb25zdCB0aXRsZSA9ICc8ZGl2IGNsYXNzPVwiZW50cnktdGl0bGVcIj4nXG4gICAgICAgICAgICAgICAgICAgICsnPGgzPicgKyBkYXRhLkV2ZW50RGF0ZSArICc8L2gzPidcbiAgICAgICAgICAgICAgICAgICAgKyc8aDM+JyArIGRhdGEuRXZlbnRMb2MgKyAnPC9oMz4nXG4gICAgICAgICAgICAgICAgICAgICsnPC9kaXY+J1xuICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICBpZiAoZGF0YS5PYmplY3RzKSB7XG4gICAgICAgIGJvZHkgKz0gXCI8b2w+XCJcbiAgICAgICAgZGF0YS5PYmplY3RzLnNwbGl0KCcsJykuZm9yRWFjaChvYmogPT4ge1xuICAgICAgICAgICAgYm9keSArPSBcIjxsaT5cIlxuICAgICAgICAgICAgYm9keSArPSBcIjxoND5cIiArIG9iaiArIFwiPC9oND5cIlxuICAgICAgICAgICAgYm9keSArPSBcIjwvbGk+XCJcbiAgICAgICAgfSlcbiAgICAgICAgYm9keSArPSBcIjwvb2w+XCJcbiAgICB9IGVsc2Uge1xuICAgICAgICBib2R5ICs9ICc8aDQgY2xhc3M9XCJuby1vYmplY3RzXCI+S2VpbmUgT2JqZWt0ZTwvaDQ+J1xuICAgIH1cbiAgICBjb25zdCBidXR0b24gPSBcIjxidXR0b24gb25jbGljaz1cXFwiXCJcbiAgICArIFwiaGFuZGxlci5oYW5kbGVFZGl0QnV0dG9uUHJlc3NlZChcXCdlbnRyeV9pZF9cIiArIGRhdGEuRXZlbnRJZCArIFwiXFwnKVxcXCI+XCJcbiAgICArIFwibWVocjwvYnV0dG9uPlwiXG4gICAgXG4gICAgbGlzdEl0ZW0uaW5uZXJIVE1MID0gdGl0bGUgKyBib2R5ICsgYnV0dG9uXG5cbiAgICBsaXN0LmFwcGVuZENoaWxkKGxpc3RJdGVtKVxufVxuXG4vLyB1cGRhdGUgdGhlIGVudHJ5IGxpc3Rcbi8vIGdldCBhbGwgaXRlbXMgZnJvbSBBUEkgYW5kIFxuLy8gYXBwZW5kIGVhY2ggb2YgdGhlbSB0byB0aGUgbGlzdFxuLy8gYWZ0ZXIgdGhhdCwgcmVjYWxjdWxhdGUgdGhlIHBhZ2VzXG5mdW5jdGlvbiB1cGRhdGVMaXN0ICgpIHtcbiAgICAvLyBlbXB0eSBvdXQgbGlzdFxuICAgIHZhciBsaXN0ID0gRE9NKCdsaXN0JylcbiAgICBsaXN0LmlubmVySFRNTCA9IFwiXCJcblxuICAgIGNvbnN0IGRhdGEgPSBmZXRjaChcIi9lbnRyeVwiKVxuICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKVxuICAgIH0pLnRoZW4oanNvbiA9PiB7XG4gICAgICAgIGpzb24uZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgIGFwcGVuZExpc3RJdGVtKGl0ZW0pXG4gICAgICAgIH0pXG4gICAgICAgIC8vIHJlY2FsY3VsYXRlIHBhZ2VzXG4gICAgICAgIHBhZ2VNYW5hZ2VyLmNoZWNrSGVpZ2h0KClcbiAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICB9KTtcbn1cblxuLy8gY2hlY2sgdGhlIGVkaXRvciBmaWVsZHMsIFxuLy8gcmV0dXJucyB0cnVlIGlmIGl0J3MgZ29vZCB0byBnbywgZWxzZSBmYWxzZVxuZnVuY3Rpb24gY2hlY2tGaWVsZHMgKCkge1xuICAgIHZhciBldmVyeXRoaW5nR29vZCA9IHRydWVcblxuICAgIC8vIGRhdGVcbiAgICBjb25zdCB5ZWFyID0gRE9NKCdlZGl0b3JfeWVhcicpLnZhbHVlXG4gICAgY29uc3QgbW9udGggPSBET00oJ2VkaXRvcl9tb250aCcpLnZhbHVlXG4gICAgY29uc3QgZGF5ID0gRE9NKCdlZGl0b3JfZGF5JykudmFsdWVcblxuICAgIGlmICh5ZWFyICE9IG51bGwgJiYgbW9udGggIT0gbnVsbCAmJiBkYXkgIT0gbnVsbCkge1xuICAgICAgICAvLyBwYWRkaW5nIHdpdGggMCdzXG4gICAgICAgIHZhciBtID0gbW9udGgudG9TdHJpbmcoKS5sZW5ndGggPCAyID8gXCIwXCIgKyBtb250aCA6IG1vbnRoXG4gICAgICAgIHZhciBkID0gZGF5LnRvU3RyaW5nKCkubGVuZ3RoIDwgMiA/IFwiMFwiICsgZGF5IDogZGF5XG5cbiAgICAgICAgdmFyIGRhdGV2YWwgPSBcIlwiXG4gICAgICAgIGRhdGV2YWwgKz0gXCJcIiArIHllYXJcbiAgICAgICAgZGF0ZXZhbCArPSBcIi1cIiArIG1cbiAgICAgICAgZGF0ZXZhbCArPSBcIi1cIiArIGRcblxuICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKGRhdGV2YWwpXG4gICAgICAgIGNvbnN0IGlzRGF0ZSA9IGRhdGUudG9TdHJpbmcoKSAhPT0gXCJJbnZhbGlkIERhdGVcIlxuXG4gICAgICAgIGlmICghaXNEYXRlKSB7XG4gICAgICAgICAgICBET00oXCJlZGl0b3JfZGF5XCIpLmNsYXNzTGlzdC5hZGQoJ2Vycm9yLWZpZWxkJylcbiAgICAgICAgICAgIERPTShcImVkaXRvcl9tb250aFwiKS5jbGFzc0xpc3QuYWRkKCdlcnJvci1maWVsZCcpXG4gICAgICAgICAgICBET00oXCJlZGl0b3JfeWVhclwiKS5jbGFzc0xpc3QuYWRkKCdlcnJvci1maWVsZCcpXG4gICAgICAgICAgICBldmVyeXRoaW5nR29vZCA9IGZhbHNlXG4gICAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgRE9NKFwiZWRpdG9yX2RheVwiKS5jbGFzc0xpc3QuYWRkKCdlcnJvci1maWVsZCcpXG4gICAgICAgIERPTShcImVkaXRvcl9tb250aFwiKS5jbGFzc0xpc3QuYWRkKCdlcnJvci1maWVsZCcpXG4gICAgICAgIERPTShcImVkaXRvcl95ZWFyXCIpLmNsYXNzTGlzdC5hZGQoJ2Vycm9yLWZpZWxkJylcbiAgICAgICAgZXZlcnl0aGluZ0dvb2QgPSBmYWxzZVxuICAgIH1cblxuICAgIC8vIHBsYWNlXG4gICAgLy8gb25seSBjaGVjayBpZiBpdHMgbm90IGVtcHR5XG4gICAgY29uc3QgbG9jdmFsID0gRE9NKFwiZWRpdG9yX3BsYWNlXCIpLnZhbHVlXG4gICAgaWYgKCFsb2N2YWwgfHwgbG9jdmFsID09PSBcIlwiKSB7XG4gICAgICAgIERPTShcImVkaXRvcl9wbGFjZVwiKS5jbGFzc0xpc3QuYWRkKCdlcnJvci1maWVsZCcpXG4gICAgICAgIGV2ZXJ5dGhpbmdHb29kID0gZmFsc2VcbiAgICB9XG5cbiAgICByZXR1cm4gZXZlcnl0aGluZ0dvb2Rcbn1cblxuLy8gc2VuZCBwb3N0IHJlcXVlc3QgdXNpbmcgZmV0Y2ggcG9zdFxuLy8gYXN5bmNocm9uaW91cyBhd2FpdFxuYXN5bmMgZnVuY3Rpb24gcG9zdERhdGEgKGRhdGEpIHtcbiAgICAvLyBkYXRhIGlzIGEganNvbiBvYmplY3RcbiAgICBjb25zdCB1cmwgPSBcIi9hZGRfZXZlbnRcIjtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGhlYWRlcnM6IHtcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIn1cbiAgICB9KS50aGVuKHJlc3BvbnNlID0+IHsgXG4gICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKClcbiAgICB9KS50aGVuKGpzb24gPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhqc29uKTtcbiAgICAgICAgdXBkYXRlTGlzdCgpXG4gICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgfSlcbn1cbi8vIHNlbmQgcG9zdCByZXF1ZXN0IHVzaW5nIGZldGNoIHB1dFxuLy8gYXN5bmNocm9uaW91cyBhd2FpdFxuYXN5bmMgZnVuY3Rpb24gcHV0RGF0YSAoZGF0YSkge1xuICAgIC8vIGRhdGEgaXMgYSBqc29uIG9iamVjdFxuICAgIGNvbnN0IHVybCA9IFwiL2VkaXRfZXZlbnRcIjtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBtZXRob2Q6ICdwdXQnLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgaGVhZGVyczoge1wiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwifVxuICAgIH0pLnRoZW4ocmVzcG9uc2UgPT4geyBcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKVxuICAgIH0pLnRoZW4oanNvbiA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGpzb24pO1xuICAgICAgICB1cGRhdGVMaXN0KClcbiAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICB9KVxuICAgXG59XG5cbi8vIHNlbmQgZGVsZXRlIHJlcXVlc3QgdXNpbmcgZmV0Y2ggZGVsZXRlXG4vLyBhc3luY2hyb25pb3VzIGF3YWl0XG5hc3luYyBmdW5jdGlvbiBkZWxldGVEYXRhIChpZCkge1xuICAgIGNvbnN0IHVybCA9IFwiL2RlbGV0ZVwiXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgbWV0aG9kOiAnZGVsZXRlJyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe2lkOiBpZH0pLFxuICAgICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6IFwiYXBwbGljYXRpb24vanNvblwifVxuICAgIH0pLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpXG4gICAgfSkudGhlbihqc29uID0+IHtcbiAgICAgICAgdXBkYXRlTGlzdCgpXG4gICAgfSkuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5sb2coZXJyb3IpKVxufVxuXG4vKiogKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqIG9uIGNsaWNrIGhhbmRsZXJzICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbnZhciBvYmpFeHBvcnQgPSB7XG5cbiAgICAvLyAnbWVocicgYnV0dG9uIGhhbmRsZXJzXG4gICAgLy8gZmlsbCB0aGUgZm9ybXMgaW4gdGhlIGVkaXRvclxuICAgIGhhbmRsZUVkaXRCdXR0b25QcmVzc2VkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgdGhpcy5oYW5kbGVDYW5jZWxFZGl0UHJlc3NlZCh0cnVlKTtcblxuICAgICAgICAvLyBnZXQgdGhlIGluZm9cbiAgICAgICAgdmFyIGVsZW0gPSBET00oaWQpXG4gICAgICAgIGNvbnN0IG9iak51bSA9IGVsZW0uY2hpbGRyZW5bMV0uY2hpbGRFbGVtZW50Q291bnRcblxuICAgICAgICBjb25zdCBpbkRhdGUgPSBlbGVtLmNoaWxkcmVuWzBdLmNoaWxkcmVuWzBdLmlubmVySFRNTDtcbiAgICAgICAgY29uc3QgaW5QbGFjZSA9IGVsZW0uY2hpbGRyZW5bMF0uY2hpbGRyZW5bMV0uaW5uZXJIVE1MO1xuXG4gICAgICAgIHRvZ2dsZUVkaXRvcklucHV0cyhmYWxzZSwgaW5EYXRlLCBpblBsYWNlKVxuXG4gICAgICAgIHZhciBvYmpzID0gRE9NKCdlZGl0b3Jfb2JqZWN0cycpO1xuXG4gICAgICAgIERPTSgnZWRpdG9yX2lkJykudmFsdWUgPSBcIlwiICsgaWQ7XG5cbiAgICAgICAgLy8gZGVsZXRlIGJ1dHRvblxuICAgICAgICBET00oJ2xvc19iJykuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICAgICAgRE9NKCdsb3NfYicpLmNsYXNzTGlzdC5hZGQoXCJmYWRlLWluXCIpXG5cbiAgICAgICAgRE9NKCdsb3NfYScpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgIERPTSgnbG9zX2EnKS5jbGFzc0xpc3QuYWRkKFwiZmFkZS1pblwiKVxuICAgICAgICBcbiAgICAgICAgRE9NKCdsb3NfYycpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgIERPTSgnbG9zX2MnKS5jbGFzc0xpc3QuYWRkKFwiZmFkZS1pblwiKVxuXG4gICAgICAgIHZhciBpbnB1dHMgPSBcIlwiO1xuICAgICAgICBjb25zdCBpbnAgPSAnPGlucHV0IHR5cGU9XCJ0ZXh0XCInO1xuXG4gICAgICAgIGlmIChvYmpOdW0gPiAwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iak51bTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdiA9IGVsZW0uY2hpbGRyZW5bMV0uY2hpbGRyZW5baV0uY2hpbGRyZW5bMF0uaW5uZXJIVE1MO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGlucCArICd2YWx1ZT1cIicgKyB2ICsnXCIgaWQ9XCJldmVudF9vYmonKyAoaSArMSkgKyAnXCI+JztcbiAgICAgICAgICAgICAgICBpbnB1dHMgKz0gdmFsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvYmpzLmlubmVySFRNTCA9IGlucHV0cztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ianMuaW5uZXJIVE1MID0gaW5wICsgJ2lkPVwiZXZlbnRfb2JqMVwiPic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGVkaXRPYmplY3RDb3VudCA9IG9iak51bTtcbiAgICAgICAgXG4gICAgfSxcblxuICAgIC8vIGVkaXRvciBhZGQgMSBvYmplY3RcbiAgICAvLyB0byBldmVudCBvYmplY3QgbGlzdFxuICAgIGhhbmRsZUFkZE9iamVjdFByZXNzZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBET00oJ2VkaXRvcl9vYmplY3RzJykuY2hpbGRyZW4ubGVuZ3RoO1xuXG4gICAgICAgIGVkaXRPYmplY3RDb3VudCsrO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSBjaGlsZHJlbjsgaSA8IGVkaXRPYmplY3RDb3VudDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIilcbiAgICAgICAgICAgIGlucHV0LnR5cGUgPSBcInRleHRcIlxuICAgICAgICAgICAgaW5wdXQuaWQgPSBcImV2ZW50X29ialwiICsgKGkrMSlcbiAgICAgICAgICAgIERPTSgnZWRpdG9yX29iamVjdHMnKS5hcHBlbmRDaGlsZChpbnB1dClcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBlZGl0b3IgZGVsZXRlIDEgb2JqZWN0XG4gICAgLy8gZnJvbSBldmVudCBvYmplY3QgbGlzdFxuICAgIGhhbmRsZURlbGV0ZU9iamVjdFByZXNzZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGVkaXRPYmplY3RDb3VudCA9PT0gMSkge1xuICAgICAgICAgICAgRE9NKCdlZGl0b3Jfb2JqZWN0cycpLmNoaWxkTm9kZXNbMF0udmFsdWUgPSBcIlwiO1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV2ZW50cyA9IERPTSgnZWRpdG9yX29iamVjdHMnKTtcbiAgICAgICAgY29uc3QgbGFzdGNoaWxkID0gZXZlbnRzLmNoaWxkcmVuLmxlbmd0aCAtIDE7XG4gICAgICAgIGV2ZW50cy5yZW1vdmVDaGlsZChldmVudHMuY2hpbGRyZW5bbGFzdGNoaWxkXSk7XG4gICAgICAgIGVkaXRPYmplY3RDb3VudC0tO1xuICAgIH0sXG5cbiAgICAvLyBjaGVjayBpZiB0aGUgZmllbGRzIGFyZSBwcm9wZXJseSBmaWxsZWRcbiAgICAvLyBzZW5kIHRoZSBwb3N0IHJlcXVlc3RcbiAgICBoYW5kbGVTYXZlRWRpdFByZXNzZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gY2hlY2sgdGhlIGZpZWxkc1xuICAgICAgICBpZiAoIWNoZWNrRmllbGRzKCkpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgZGF0ZSA9IFwiXCJcbiAgICAgICAgZGF0ZSArPSBcIlwiICsgRE9NKCdlZGl0b3JfeWVhcicpLnZhbHVlXG4gICAgICAgIGRhdGUgKz0gXCItXCIgKyBET00oJ2VkaXRvcl9tb250aCcpLnZhbHVlXG4gICAgICAgIGRhdGUgKz0gXCItXCIgKyBET00oJ2VkaXRvcl9kYXknKS52YWx1ZVxuICAgICAgICB2YXIgcGxhYyA9IERPTSgnZWRpdG9yX3BsYWNlJyk7XG4gICAgICAgIHZhciBvYmpzID0gRE9NKCdlZGl0b3Jfb2JqZWN0cycpLmNoaWxkTm9kZXM7XG4gICAgICAgIGNvbnN0IElEID0gRE9NKCdlZGl0b3JfaWQnKS52YWx1ZS5zcGxpdCgnXycpWzJdO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIGV2ZW50X2RhdGU6IGRhdGUsXG4gICAgICAgICAgICBldmVudF9sb2M6IHBsYWMudmFsdWUsXG4gICAgICAgICAgICBpZDogSURcbiAgICAgICAgfVxuICAgICAgICBvYmpzLmZvckVhY2gob2JqID0+IHtcbiAgICAgICAgICAgIC8vIG9ubHkgYWRkIGZpZWxkIG9iamVjdHNcbiAgICAgICAgICAgIGlmIChvYmoudmFsdWUgJiYgb2JqLnZhbHVlICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgZGF0YVtvYmouaWRdID0gb2JqLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIHB1dCBkYXRhXG4gICAgICAgIC8vIGlmIHRoZSBpZCBpcyBlbXB0eSwgdGhlbiBwb3N0IGRhdGFcbiAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgIHB1dERhdGEoZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3N0RGF0YShkYXRhKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmhhbmRsZUNhbmNlbEVkaXRQcmVzc2VkKCk7XG4gICAgfSxcblxuICAgIC8vIHNldCBpbml0aWFsIGVkaXRvciBzdGF0ZVxuICAgIGhhbmRsZUNhbmNlbEVkaXRQcmVzc2VkOiBmdW5jdGlvbiAobm90b2dnbGU9ZmFsc2UpIHtcbiAgICAgICAgdmFyIG9ianMgPSBET00oJ2VkaXRvcl9vYmplY3RzJyk7XG4gICAgICAgIG9ianMuaW5uZXJIVE1MID0gXCI8aW5wdXQgdHlwZT0ndGV4dCcgZGlzYWJsZWQ+XCI7XG4gICAgICAgIFxuICAgICAgICBET00oJ2VkaXRvcl9pZCcpLnZhbHVlID0gXCJcIjtcblxuICAgICAgICBpZiAoIW5vdG9nZ2xlKSB7XG4gICAgICAgICAgICB0b2dnbGVFZGl0b3JJbnB1dHModHJ1ZSwgXCJcIiwgXCJcIilcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRlbGV0ZSBidXR0b25cbiAgICAgICAgRE9NKCdsb3NfYicpLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgRE9NKCdsb3NfYicpLmNsYXNzTGlzdC5yZW1vdmUoXCJmYWRlLWluXCIpXG5cbiAgICAgICAgRE9NKCdsb3NfYScpLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgRE9NKCdsb3NfYScpLmNsYXNzTGlzdC5yZW1vdmUoXCJmYWRlLWluXCIpXG5cbiAgICAgICAgRE9NKCdsb3NfYycpLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgRE9NKCdsb3NfYycpLmNsYXNzTGlzdC5yZW1vdmUoXCJmYWRlLWluXCIpXG5cbiAgICAgICAgRE9NKCdlZGl0b3JfcGxhY2UnKS5jbGFzc0xpc3QucmVtb3ZlKCdlcnJvci1maWVsZCcpXG4gICAgICAgIERPTSgnZWRpdG9yX2RheScpLmNsYXNzTGlzdC5yZW1vdmUoJ2Vycm9yLWZpZWxkJylcbiAgICAgICAgRE9NKCdlZGl0b3JfbW9udGgnKS5jbGFzc0xpc3QucmVtb3ZlKCdlcnJvci1maWVsZCcpXG4gICAgICAgIERPTSgnZWRpdG9yX3llYXInKS5jbGFzc0xpc3QucmVtb3ZlKCdlcnJvci1maWVsZCcpXG5cbiAgICB9LFxuXG4gICAgLy8gY3JlYXRlIGEgbmV3IGVudHJ5XG4gICAgaGFuZGxlTmV3RW50cnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5oYW5kbGVDYW5jZWxFZGl0UHJlc3NlZCgpO1xuICAgICAgICBET00oJ2xvc19iJykuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICBcbiAgICAgICAgdmFyIG9ianMgPSBET00oJ2VkaXRvcl9vYmplY3RzJyk7XG4gICAgICAgIFxuICAgICAgICBvYmpzLmlubmVySFRNTCA9ICc8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cImV2ZW50X29iajFcIj4nO1xuICAgICAgICBcbiAgICAgICAgRE9NKCdlZGl0b3JfaWQnKS52YWx1ZSA9IFwiXCI7XG5cbiAgICAgICAgdG9nZ2xlRWRpdG9ySW5wdXRzKGZhbHNlLCBcIlwiLCBcIlwiKTtcblxuICAgICAgICBlZGl0T2JqZWN0Q291bnQgPSAxO1xuXG4gICAgfSxcblxuICAgIC8vIGRlbGV0ZSBlbnRyeSBpbiB0aGUgZWRpdG9yXG4gICAgaGFuZGxlRGVsZXRlRW50cnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgSUQgPSBET00oJ2VkaXRvcl9pZCcpLnZhbHVlLnNwbGl0KCdfJylbMl07XG4gICAgICAgIGlmIChJRCkge1xuICAgICAgICAgICAgZGVsZXRlRGF0YShJRClcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhhbmRsZUNhbmNlbEVkaXRQcmVzc2VkKClcbiAgICB9LFxuXG4gICAgaGFuZGxlUGFnZUJ1dHRvbjogZnVuY3Rpb24gKGlzUGx1cykge1xuICAgICAgICBwYWdlTWFuYWdlci5oYW5kbGVQYWdlQnV0dG9uKGlzUGx1cylcbiAgICB9LFxuXG4gICAgLy8gY2hlY2sgZm9yIG1pbiBtYXggdmFsdWVzIGZvciBkYXRlc1xuICAgIGNoZWNrTWluTWF4OiBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICBjb25zdCBtYXggPSBwYXJzZUludChlbGVtLm1heClcbiAgICAgICAgY29uc3QgbWluID0gcGFyc2VJbnQoZWxlbS5taW4pXG4gICAgICAgIFxuICAgICAgICBpZiAoZWxlbS52YWx1ZSA8PSBtYXggJiYgZWxlbS52YWx1ZSA+PSBtaW4pIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGVsZW0udmFsdWUgPCBtaW4pIHtcbiAgICAgICAgICAgIGVsZW0udmFsdWUgPSBtaW5cbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZWxlbS52YWx1ZSA+IG1heCkge1xuICAgICAgICAgICAgZWxlbS52YWx1ZSA9IG1heFxuICAgICAgICB9XG4gICAgfVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gb2JqRXhwb3J0XG4iLCIvLyBmaWxsIHRoZSBwYWdlIGRpY3Rpb25hcnlcbnZhciBjdXJyZW50UGFnZTtcbnZhciBwYWdlcztcbmZ1bmN0aW9uIGZpbGxQYWdlcyAocGFnZU51bSwgbGFzdEluZGV4KSB7XG4gICAgcGFnZXNbcGFnZU51bV0gPSBsYXN0SW5kZXhcbn1cblxuLy8gaGlkZSB0aGUgY29ycmVjdCBpdGVtc1xuZnVuY3Rpb24gaGlkZU90aGVyUGFnZXMgKCkge1xuICAgIGNvbnN0IGl0ZW1zID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xpc3QnKS5jaGlsZHJlbjtcbiAgICBjb25zdCBpdGVtc051bSA9IGl0ZW1zLmxlbmd0aDtcblxuICAgIHZhciBmaXJzdE9mUGFnZSA9IC0xO1xuICAgIHZhciBsYXN0T2ZQYWdlID0gcGFnZXNbY3VycmVudFBhZ2VdO1xuICAgIFxuICAgIC8vIGlmIHByZXZpb3VzIHBhZ2UgZXhpc3RzXG4gICAgaWYgKHBhZ2VzW2N1cnJlbnRQYWdlLTFdICE9IG51bGwpIHtcbiAgICAgICAgZmlyc3RPZlBhZ2UgPSBwYWdlc1tjdXJyZW50UGFnZS0xXSArIDFcbiAgICB9IGVsc2Uge1xuICAgICAgICBmaXJzdE9mUGFnZSA9IDA7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtc051bTsgaSsrKSB7XG4gICAgICAgIGlmIChpIDwgZmlyc3RPZlBhZ2UgfHwgaSA+IGxhc3RPZlBhZ2UpIHtcbiAgICAgICAgICAgIGl0ZW1zW2ldLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGl0ZW1zW2ldLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIGRpc3BsYXkgbnVtYmVyIG9mIHBhZ2VzIGFuZCBjdXJyZW50IHBhZ2VcbmZ1bmN0aW9uIHBhZ2VTdGF0dXMgKCkge1xuICAgIHZhciBzdGF0dXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGFnZV9zdGF0dXMnKTtcbiAgICB2YXIgc2l6ZSA9IDA7XG4gICAgdmFyIGtleTtcbiAgICBmb3IgKGtleSBpbiBwYWdlcykge1xuICAgICAgICBpZiAocGFnZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHZhciBtc2cgPSBjdXJyZW50UGFnZSArIFwiIG9mIFwiICsgc2l6ZTtcbiAgICBzdGF0dXMuaW5uZXJUZXh0ID0gbXNnO1xufVxuXG4vLyBkaXNwbGF5IHRoZSBpdGVtcyB0aGF0IGZpdCBvbiB0aGUgd2luZG93LCB3aXRob3V0IHNjcm9sbGluZ1xuZnVuY3Rpb24gY2hlY2tIZWlnaHQgKCkge1xuICAgIC8vIGNhbGMgdGhlIHdpbmRvdyBoZWlnaHQgdG8gZml0IGEgbWF4aW1hbCBhbW91bnQgb2YgaXRlbXNcbiAgICBjb25zdCB3aW5IZWkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAxNDA7XG5cbiAgICBjb25zdCBsaXN0SXRlbXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGlzdCcpLmNoaWxkcmVuO1xuICAgIGNvbnN0IGl0ZW1zTnVtID0gbGlzdEl0ZW1zLmxlbmd0aDtcblxuICAgIHZhciBpdGVtc0hlaWdodCA9IDA7XG4gICAgdmFyIHBhZ2VOdW0gPSAxO1xuICAgIFxuICAgIGN1cnJlbnRQYWdlID0gMTtcbiAgICBwYWdlcyA9IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtc051bTsgaSsrKSB7XG4gICAgICAgIC8vIHNob3cgdGhlbSBhbGwgYWdhaW4sIHRvIGJlIG1lc3N1cmVkXG4gICAgICAgIGxpc3RJdGVtc1tpXS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgICAgICB2YXIgaCA9IGxpc3RJdGVtc1tpXS5vZmZzZXRIZWlnaHQ7XG4gICAgICAgIGl0ZW1zSGVpZ2h0ICs9IGg7XG4gICAgICAgIFxuICAgICAgICAvLyBpZiB0aGUgaXRlbXMgaGVpZ2h0IGlzIGJpZ2dlciB0aGFuIHRoZSB3aW5kb3dcbiAgICAgICAgLy8gdGhlbiBhc2lnbiB0aGVtIHRvIGEgZGlmZmVyZW50IHBhZ2VcbiAgICAgICAgaWYgKGl0ZW1zSGVpZ2h0ID49IHdpbkhlaSkge1xuICAgICAgICAgICAgZmlsbFBhZ2VzKHBhZ2VOdW0sIChpIC0gMSkpO1xuICAgICAgICAgICAgaXRlbXNIZWlnaHQgPSBoO1xuICAgICAgICAgICAgcGFnZU51bSsrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpID09PSBpdGVtc051bSAtIDEpIHtcbiAgICAgICAgICAgIGZpbGxQYWdlcyhwYWdlTnVtLCBpKTtcbiAgICAgICAgICAgIHBhZ2VOdW0rKztcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIC8vIGhpZGUgaXRlbXMgYWZ0ZXIgdGhlIGxhc3QgaXRlbSBvZiB0aGUgcGFnZVxuICAgIGhpZGVPdGhlclBhZ2VzKCk7XG4gICAgLy8gc2hvdyBudW1iZXIgb2YgcGFnZXMgYW5kIGN1cnJlbnQgb25lXG4gICAgcGFnZVN0YXR1cygpO1xuICAgIFxufVxuLy8gaGFuZGxlIGJ1dHRvbnMgbmV4dCBwYWdlIGFuZCBwcmV2aW91cyBwYWdlXG5mdW5jdGlvbiBoYW5kbGVQYWdlQnV0dG9uIChpc1BsdXMpIHtcbiAgICBcbiAgICBpZiAoaXNQbHVzKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBjdXJyZW50UGFnZSArIDE7XG5cbiAgICAgICAgaWYgKG5leHQgaW4gcGFnZXMpIHtcbiAgICAgICAgICAgIGN1cnJlbnRQYWdlID0gbmV4dDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSBjdXJyZW50UGFnZSAtIDE7XG5cbiAgICAgICAgaWYgKHByZXYgaW4gcGFnZXMpIHtcbiAgICAgICAgICAgIGN1cnJlbnRQYWdlID0gcHJldjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGhpZGVPdGhlclBhZ2VzKCk7XG4gICAgcGFnZVN0YXR1cygpO1xufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIGNoZWNrSGVpZ2h0KCk7XG59XG5cbnZhciByZXNpemVyO1xud2luZG93Lm9ucmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgIGNsZWFyVGltZW91dChyZXNpemVyKVxuICAgICByZXNpemVyID0gdGhpcy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgY2hlY2tIZWlnaHQoKTtcbiAgICB9LCAyMDApXG5cbn1cblxuZXhwb3J0cy5jaGVja0hlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjaGVja0hlaWdodCgpXG59XG5cbmV4cG9ydHMuaGFuZGxlUGFnZUJ1dHRvbiA9IGZ1bmN0aW9uIChpc1BsdXMpIHtcbiAgICBoYW5kbGVQYWdlQnV0dG9uKGlzUGx1cylcbn0gXG4iXX0=
