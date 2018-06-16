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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbXBpbGFibGVzL2pzL21haW4uanMiLCJjb21waWxhYmxlcy9qcy9wYWdlLW1hbmFnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJjb25zdCBwYWdlTWFuYWdlciA9IHJlcXVpcmUoJy4vcGFnZS1tYW5hZ2VyJylcclxuXHJcbnZhciBlZGl0T2JqZWN0Q291bnQgPSAxO1xyXG5cclxuLyoqICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiBmdW5jdGlvbnMgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbi8vIHJldHVybnMgdGhlIGVsZW1lbnQgKGxlc3MgcmVkdW5kYW5jeSlcclxuZnVuY3Rpb24gRE9NIChpZCkge1xyXG4gICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcclxufVxyXG5cclxuLy8gZW5hYmxlIC8gZGlzYWJsZSB0aGUgZWRpdG9yIGlucHV0IGZpZWxkcywgYW5kIG9wdGlvbmFsbHlcclxuLy8gZmlsbCB0aGVtIHdpdGggYSBnaXZlbiB2YWx1ZVxyXG5mdW5jdGlvbiB0b2dnbGVFZGl0b3JJbnB1dHMgKGRpc2FibGUsIGluRGF0ZT1udWxsLCBpblBsYWNlPW51bGwpIHtcclxuICAgIHZhciBkYXkgPSBET00oJ2VkaXRvcl9kYXknKVxyXG4gICAgdmFyIG1vbnRoID0gRE9NKCdlZGl0b3JfbW9udGgnKVxyXG4gICAgdmFyIHllYXIgPSBET00oJ2VkaXRvcl95ZWFyJylcclxuXHJcbiAgICB2YXIgcGxhYyA9IERPTSgnZWRpdG9yX3BsYWNlJyk7XHJcbiAgICBpZiAoaW5EYXRlICE9PSBudWxsKSB7XHJcbiAgICAgICAgaWYgKGluRGF0ZSAhPT0gXCJcIikge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRlID0gaW5EYXRlLnNwbGl0KCctJylcclxuICAgICAgICAgICAgZGF5LnZhbHVlID0gcGFyc2VJbnQoZGF0ZVsyXSlcclxuICAgICAgICAgICAgbW9udGgudmFsdWUgPSBwYXJzZUludChkYXRlWzFdKVxyXG4gICAgICAgICAgICB5ZWFyLnZhbHVlID0gcGFyc2VJbnQoZGF0ZVswXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkYXkudmFsdWUgPSBcIlwiXHJcbiAgICAgICAgICAgIG1vbnRoLnZhbHVlID0gXCJcIlxyXG4gICAgICAgICAgICB5ZWFyLnZhbHVlID0gXCJcIlxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChpblBsYWNlICE9IG51bGwpIHtcclxuICAgICAgICBwbGFjLnZhbHVlID0gaW5QbGFjZVxyXG4gICAgICAgIHBsYWMub25jaGFuZ2UoKVxyXG4gICAgfVxyXG5cclxuICAgIGRheS5kaXNhYmxlZCA9IGRpc2FibGU7XHJcbiAgICBtb250aC5kaXNhYmxlZCA9IGRpc2FibGU7XHJcbiAgICB5ZWFyLmRpc2FibGVkID0gZGlzYWJsZTtcclxuICAgIHBsYWMuZGlzYWJsZWQgPSBkaXNhYmxlO1xyXG4gICAgRE9NKCdhZGRfYicpLmRpc2FibGVkID0gZGlzYWJsZTtcclxuICAgIERPTSgnZGVsX2InKS5kaXNhYmxlZCA9IGRpc2FibGU7XHJcbiAgICBET00oJ2VuZF9iJykuZGlzYWJsZWQgPSBkaXNhYmxlO1xyXG4gICAgRE9NKCdjYW5fYicpLmRpc2FibGVkID0gZGlzYWJsZTtcclxuICAgIFxyXG59XHJcblxyXG4vLyBhcHBlbmQgYW4gZW50cnkgaXRlbSB0byB0aGUgZW50cnkgbGlzdFxyXG4vLyBnaXZlbiBhIGpzb24gZGF0YSBvYmplY3RcclxuZnVuY3Rpb24gYXBwZW5kTGlzdEl0ZW0gKGRhdGEpIHtcclxuICAgIHZhciBsaXN0ID0gRE9NKCdsaXN0JylcclxuICAgIHZhciBsaXN0SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKTtcclxuICAgIGxpc3RJdGVtLmNsYXNzTGlzdC5hZGQoXCJmYWRlLWluXCIpXHJcbiAgICBsaXN0SXRlbS5pZCA9IFwiZW50cnlfaWRfXCIgKyBkYXRhLkV2ZW50SWRcclxuICAgIGNvbnN0IHRpdGxlID0gJzxkaXYgY2xhc3M9XCJlbnRyeS10aXRsZVwiPidcclxuICAgICAgICAgICAgICAgICAgICArJzxoMz4nICsgZGF0YS5FdmVudERhdGUgKyAnPC9oMz4nXHJcbiAgICAgICAgICAgICAgICAgICAgKyc8aDM+JyArIGRhdGEuRXZlbnRMb2MgKyAnPC9oMz4nXHJcbiAgICAgICAgICAgICAgICAgICAgKyc8L2Rpdj4nXHJcbiAgICB2YXIgYm9keSA9IFwiXCI7XHJcbiAgICBpZiAoZGF0YS5PYmplY3RzKSB7XHJcbiAgICAgICAgYm9keSArPSBcIjxvbD5cIlxyXG4gICAgICAgIGRhdGEuT2JqZWN0cy5zcGxpdCgnLCcpLmZvckVhY2gob2JqID0+IHtcclxuICAgICAgICAgICAgYm9keSArPSBcIjxsaT5cIlxyXG4gICAgICAgICAgICBib2R5ICs9IFwiPGg0PlwiICsgb2JqICsgXCI8L2g0PlwiXHJcbiAgICAgICAgICAgIGJvZHkgKz0gXCI8L2xpPlwiXHJcbiAgICAgICAgfSlcclxuICAgICAgICBib2R5ICs9IFwiPC9vbD5cIlxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBib2R5ICs9ICc8aDQgY2xhc3M9XCJuby1vYmplY3RzXCI+S2VpbmUgT2JqZWt0ZTwvaDQ+J1xyXG4gICAgfVxyXG4gICAgY29uc3QgYnV0dG9uID0gXCI8YnV0dG9uIG9uY2xpY2s9XFxcIlwiXHJcbiAgICArIFwiaGFuZGxlci5oYW5kbGVFZGl0QnV0dG9uUHJlc3NlZChcXCdlbnRyeV9pZF9cIiArIGRhdGEuRXZlbnRJZCArIFwiXFwnKVxcXCI+XCJcclxuICAgICsgXCJtZWhyPC9idXR0b24+XCJcclxuICAgIFxyXG4gICAgbGlzdEl0ZW0uaW5uZXJIVE1MID0gdGl0bGUgKyBib2R5ICsgYnV0dG9uXHJcblxyXG4gICAgbGlzdC5hcHBlbmRDaGlsZChsaXN0SXRlbSlcclxufVxyXG5cclxuLy8gdXBkYXRlIHRoZSBlbnRyeSBsaXN0XHJcbi8vIGdldCBhbGwgaXRlbXMgZnJvbSBBUEkgYW5kIFxyXG4vLyBhcHBlbmQgZWFjaCBvZiB0aGVtIHRvIHRoZSBsaXN0XHJcbi8vIGFmdGVyIHRoYXQsIHJlY2FsY3VsYXRlIHRoZSBwYWdlc1xyXG5mdW5jdGlvbiB1cGRhdGVMaXN0ICgpIHtcclxuICAgIC8vIGVtcHR5IG91dCBsaXN0XHJcbiAgICB2YXIgbGlzdCA9IERPTSgnbGlzdCcpXHJcbiAgICBsaXN0LmlubmVySFRNTCA9IFwiXCJcclxuXHJcbiAgICBjb25zdCBkYXRhID0gZmV0Y2goXCIvZW50cnlcIilcclxuICAgIC50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpXHJcbiAgICB9KS50aGVuKGpzb24gPT4ge1xyXG4gICAgICAgIGpzb24uZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgYXBwZW5kTGlzdEl0ZW0oaXRlbSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIC8vIHJlY2FsY3VsYXRlIHBhZ2VzXHJcbiAgICAgICAgcGFnZU1hbmFnZXIuY2hlY2tIZWlnaHQoKVxyXG4gICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vLyBjaGVjayB0aGUgZWRpdG9yIGZpZWxkcywgXHJcbi8vIHJldHVybnMgdHJ1ZSBpZiBpdCdzIGdvb2QgdG8gZ28sIGVsc2UgZmFsc2VcclxuZnVuY3Rpb24gY2hlY2tGaWVsZHMgKCkge1xyXG4gICAgdmFyIGV2ZXJ5dGhpbmdHb29kID0gdHJ1ZVxyXG5cclxuICAgIC8vIGRhdGVcclxuICAgIGNvbnN0IHllYXIgPSBET00oJ2VkaXRvcl95ZWFyJykudmFsdWVcclxuICAgIGNvbnN0IG1vbnRoID0gRE9NKCdlZGl0b3JfbW9udGgnKS52YWx1ZVxyXG4gICAgY29uc3QgZGF5ID0gRE9NKCdlZGl0b3JfZGF5JykudmFsdWVcclxuXHJcbiAgICBpZiAoeWVhciAhPSBudWxsICYmIG1vbnRoICE9IG51bGwgJiYgZGF5ICE9IG51bGwpIHtcclxuICAgICAgICAvLyBwYWRkaW5nIHdpdGggMCdzXHJcbiAgICAgICAgdmFyIG0gPSBtb250aC50b1N0cmluZygpLmxlbmd0aCA8IDIgPyBcIjBcIiArIG1vbnRoIDogbW9udGhcclxuICAgICAgICB2YXIgZCA9IGRheS50b1N0cmluZygpLmxlbmd0aCA8IDIgPyBcIjBcIiArIGRheSA6IGRheVxyXG5cclxuICAgICAgICB2YXIgZGF0ZXZhbCA9IFwiXCJcclxuICAgICAgICBkYXRldmFsICs9IFwiXCIgKyB5ZWFyXHJcbiAgICAgICAgZGF0ZXZhbCArPSBcIi1cIiArIG1cclxuICAgICAgICBkYXRldmFsICs9IFwiLVwiICsgZFxyXG5cclxuICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKGRhdGV2YWwpXHJcbiAgICAgICAgY29uc3QgaXNEYXRlID0gZGF0ZS50b1N0cmluZygpICE9PSBcIkludmFsaWQgRGF0ZVwiXHJcblxyXG4gICAgICAgIGlmICghaXNEYXRlKSB7XHJcbiAgICAgICAgICAgIERPTShcImVkaXRvcl9kYXlcIikuY2xhc3NMaXN0LmFkZCgnZXJyb3ItZmllbGQnKVxyXG4gICAgICAgICAgICBET00oXCJlZGl0b3JfbW9udGhcIikuY2xhc3NMaXN0LmFkZCgnZXJyb3ItZmllbGQnKVxyXG4gICAgICAgICAgICBET00oXCJlZGl0b3JfeWVhclwiKS5jbGFzc0xpc3QuYWRkKCdlcnJvci1maWVsZCcpXHJcbiAgICAgICAgICAgIGV2ZXJ5dGhpbmdHb29kID0gZmFsc2VcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgRE9NKFwiZWRpdG9yX2RheVwiKS5jbGFzc0xpc3QuYWRkKCdlcnJvci1maWVsZCcpXHJcbiAgICAgICAgRE9NKFwiZWRpdG9yX21vbnRoXCIpLmNsYXNzTGlzdC5hZGQoJ2Vycm9yLWZpZWxkJylcclxuICAgICAgICBET00oXCJlZGl0b3JfeWVhclwiKS5jbGFzc0xpc3QuYWRkKCdlcnJvci1maWVsZCcpXHJcbiAgICAgICAgZXZlcnl0aGluZ0dvb2QgPSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHBsYWNlXHJcbiAgICAvLyBvbmx5IGNoZWNrIGlmIGl0cyBub3QgZW1wdHlcclxuICAgIGNvbnN0IGxvY3ZhbCA9IERPTShcImVkaXRvcl9wbGFjZVwiKS52YWx1ZVxyXG4gICAgaWYgKCFsb2N2YWwgfHwgbG9jdmFsID09PSBcIlwiKSB7XHJcbiAgICAgICAgRE9NKFwiZWRpdG9yX3BsYWNlXCIpLmNsYXNzTGlzdC5hZGQoJ2Vycm9yLWZpZWxkJylcclxuICAgICAgICBldmVyeXRoaW5nR29vZCA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGV2ZXJ5dGhpbmdHb29kXHJcbn1cclxuXHJcbi8vIHNlbmQgcG9zdCByZXF1ZXN0IHVzaW5nIGZldGNoIHBvc3RcclxuLy8gYXN5bmNocm9uaW91cyBhd2FpdFxyXG5hc3luYyBmdW5jdGlvbiBwb3N0RGF0YSAoZGF0YSkge1xyXG4gICAgLy8gZGF0YSBpcyBhIGpzb24gb2JqZWN0XHJcbiAgICBjb25zdCB1cmwgPSBcIi9hZGRfZXZlbnRcIjtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XHJcbiAgICAgICAgbWV0aG9kOiAncG9zdCcsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXHJcbiAgICAgICAgaGVhZGVyczoge1wiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwifVxyXG4gICAgfSkudGhlbihyZXNwb25zZSA9PiB7IFxyXG4gICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKClcclxuICAgIH0pLnRoZW4oanNvbiA9PiB7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coanNvbik7XHJcbiAgICAgICAgdXBkYXRlTGlzdCgpXHJcbiAgICB9KS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgfSlcclxufVxyXG4vLyBzZW5kIHBvc3QgcmVxdWVzdCB1c2luZyBmZXRjaCBwdXRcclxuLy8gYXN5bmNocm9uaW91cyBhd2FpdFxyXG5hc3luYyBmdW5jdGlvbiBwdXREYXRhIChkYXRhKSB7XHJcbiAgICAvLyBkYXRhIGlzIGEganNvbiBvYmplY3RcclxuICAgIGNvbnN0IHVybCA9IFwiL2VkaXRfZXZlbnRcIjtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XHJcbiAgICAgICAgbWV0aG9kOiAncHV0JyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKSxcclxuICAgICAgICBoZWFkZXJzOiB7XCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJ9XHJcbiAgICB9KS50aGVuKHJlc3BvbnNlID0+IHsgXHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKVxyXG4gICAgfSkudGhlbihqc29uID0+IHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhqc29uKTtcclxuICAgICAgICB1cGRhdGVMaXN0KClcclxuICAgIH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICB9KVxyXG4gICBcclxufVxyXG5cclxuLy8gc2VuZCBkZWxldGUgcmVxdWVzdCB1c2luZyBmZXRjaCBkZWxldGVcclxuLy8gYXN5bmNocm9uaW91cyBhd2FpdFxyXG5hc3luYyBmdW5jdGlvbiBkZWxldGVEYXRhIChpZCkge1xyXG4gICAgY29uc3QgdXJsID0gXCIvZGVsZXRlXCJcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnZGVsZXRlJyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7aWQ6IGlkfSksXHJcbiAgICAgICAgaGVhZGVyczogeydDb250ZW50LVR5cGUnOiBcImFwcGxpY2F0aW9uL2pzb25cIn1cclxuICAgIH0pLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKClcclxuICAgIH0pLnRoZW4oanNvbiA9PiB7XHJcbiAgICAgICAgdXBkYXRlTGlzdCgpXHJcbiAgICB9KS5jYXRjaChlcnJvciA9PiBjb25zb2xlLmxvZyhlcnJvcikpXHJcbn1cclxuXHJcbi8qKiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogb24gY2xpY2sgaGFuZGxlcnMgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbnZhciBvYmpFeHBvcnQgPSB7XHJcblxyXG4gICAgLy8gJ21laHInIGJ1dHRvbiBoYW5kbGVyc1xyXG4gICAgLy8gZmlsbCB0aGUgZm9ybXMgaW4gdGhlIGVkaXRvclxyXG4gICAgaGFuZGxlRWRpdEJ1dHRvblByZXNzZWQ6IGZ1bmN0aW9uIChpZCkge1xyXG4gICAgICAgIHRoaXMuaGFuZGxlQ2FuY2VsRWRpdFByZXNzZWQodHJ1ZSk7XHJcblxyXG4gICAgICAgIC8vIGdldCB0aGUgaW5mb1xyXG4gICAgICAgIHZhciBlbGVtID0gRE9NKGlkKVxyXG4gICAgICAgIGNvbnN0IG9iak51bSA9IGVsZW0uY2hpbGRyZW5bMV0uY2hpbGRFbGVtZW50Q291bnRcclxuXHJcbiAgICAgICAgY29uc3QgaW5EYXRlID0gZWxlbS5jaGlsZHJlblswXS5jaGlsZHJlblswXS5pbm5lckhUTUw7XHJcbiAgICAgICAgY29uc3QgaW5QbGFjZSA9IGVsZW0uY2hpbGRyZW5bMF0uY2hpbGRyZW5bMV0uaW5uZXJIVE1MO1xyXG5cclxuICAgICAgICB0b2dnbGVFZGl0b3JJbnB1dHMoZmFsc2UsIGluRGF0ZSwgaW5QbGFjZSlcclxuXHJcbiAgICAgICAgdmFyIG9ianMgPSBET00oJ2VkaXRvcl9vYmplY3RzJyk7XHJcblxyXG4gICAgICAgIERPTSgnZWRpdG9yX2lkJykudmFsdWUgPSBcIlwiICsgaWQ7XHJcblxyXG4gICAgICAgIC8vIGRlbGV0ZSBidXR0b25cclxuICAgICAgICBET00oJ2xvc19iJykuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgICAgICBET00oJ2xvc19iJykuY2xhc3NMaXN0LmFkZChcImZhZGUtaW5cIilcclxuXHJcbiAgICAgICAgRE9NKCdsb3NfYScpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICAgICAgRE9NKCdsb3NfYScpLmNsYXNzTGlzdC5hZGQoXCJmYWRlLWluXCIpXHJcbiAgICAgICAgXHJcbiAgICAgICAgRE9NKCdsb3NfYycpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICAgICAgRE9NKCdsb3NfYycpLmNsYXNzTGlzdC5hZGQoXCJmYWRlLWluXCIpXHJcblxyXG4gICAgICAgIHZhciBpbnB1dHMgPSBcIlwiO1xyXG4gICAgICAgIGNvbnN0IGlucCA9ICc8aW5wdXQgdHlwZT1cInRleHRcIic7XHJcblxyXG4gICAgICAgIGlmIChvYmpOdW0gPiAwKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqTnVtOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHYgPSBlbGVtLmNoaWxkcmVuWzFdLmNoaWxkcmVuW2ldLmNoaWxkcmVuWzBdLmlubmVySFRNTDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGlucCArICd2YWx1ZT1cIicgKyB2ICsnXCIgaWQ9XCJldmVudF9vYmonKyAoaSArMSkgKyAnXCI+JztcclxuICAgICAgICAgICAgICAgIGlucHV0cyArPSB2YWw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG9ianMuaW5uZXJIVE1MID0gaW5wdXRzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG9ianMuaW5uZXJIVE1MID0gaW5wICsgJ2lkPVwiZXZlbnRfb2JqMVwiPic7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGVkaXRPYmplY3RDb3VudCA9IG9iak51bTtcclxuICAgICAgICBcclxuICAgIH0sXHJcblxyXG4gICAgLy8gZWRpdG9yIGFkZCAxIG9iamVjdFxyXG4gICAgLy8gdG8gZXZlbnQgb2JqZWN0IGxpc3RcclxuICAgIGhhbmRsZUFkZE9iamVjdFByZXNzZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBjb25zdCBjaGlsZHJlbiA9IERPTSgnZWRpdG9yX29iamVjdHMnKS5jaGlsZHJlbi5sZW5ndGg7XHJcblxyXG4gICAgICAgIGVkaXRPYmplY3RDb3VudCsrO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gY2hpbGRyZW47IGkgPCBlZGl0T2JqZWN0Q291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIilcclxuICAgICAgICAgICAgaW5wdXQudHlwZSA9IFwidGV4dFwiXHJcbiAgICAgICAgICAgIGlucHV0LmlkID0gXCJldmVudF9vYmpcIiArIChpKzEpXHJcbiAgICAgICAgICAgIERPTSgnZWRpdG9yX29iamVjdHMnKS5hcHBlbmRDaGlsZChpbnB1dClcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIGVkaXRvciBkZWxldGUgMSBvYmplY3RcclxuICAgIC8vIGZyb20gZXZlbnQgb2JqZWN0IGxpc3RcclxuICAgIGhhbmRsZURlbGV0ZU9iamVjdFByZXNzZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoZWRpdE9iamVjdENvdW50ID09PSAxKSB7XHJcbiAgICAgICAgICAgIERPTSgnZWRpdG9yX29iamVjdHMnKS5jaGlsZE5vZGVzWzBdLnZhbHVlID0gXCJcIjtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBldmVudHMgPSBET00oJ2VkaXRvcl9vYmplY3RzJyk7XHJcbiAgICAgICAgY29uc3QgbGFzdGNoaWxkID0gZXZlbnRzLmNoaWxkcmVuLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgZXZlbnRzLnJlbW92ZUNoaWxkKGV2ZW50cy5jaGlsZHJlbltsYXN0Y2hpbGRdKTtcclxuICAgICAgICBlZGl0T2JqZWN0Q291bnQtLTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gY2hlY2sgaWYgdGhlIGZpZWxkcyBhcmUgcHJvcGVybHkgZmlsbGVkXHJcbiAgICAvLyBzZW5kIHRoZSBwb3N0IHJlcXVlc3RcclxuICAgIGhhbmRsZVNhdmVFZGl0UHJlc3NlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIC8vIGNoZWNrIHRoZSBmaWVsZHNcclxuICAgICAgICBpZiAoIWNoZWNrRmllbGRzKCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBkYXRlID0gXCJcIlxyXG4gICAgICAgIGRhdGUgKz0gXCJcIiArIERPTSgnZWRpdG9yX3llYXInKS52YWx1ZVxyXG4gICAgICAgIGRhdGUgKz0gXCItXCIgKyBET00oJ2VkaXRvcl9tb250aCcpLnZhbHVlXHJcbiAgICAgICAgZGF0ZSArPSBcIi1cIiArIERPTSgnZWRpdG9yX2RheScpLnZhbHVlXHJcbiAgICAgICAgdmFyIHBsYWMgPSBET00oJ2VkaXRvcl9wbGFjZScpO1xyXG4gICAgICAgIHZhciBvYmpzID0gRE9NKCdlZGl0b3Jfb2JqZWN0cycpLmNoaWxkTm9kZXM7XHJcbiAgICAgICAgY29uc3QgSUQgPSBET00oJ2VkaXRvcl9pZCcpLnZhbHVlLnNwbGl0KCdfJylbMl07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcclxuICAgICAgICAgICAgZXZlbnRfZGF0ZTogZGF0ZSxcclxuICAgICAgICAgICAgZXZlbnRfbG9jOiBwbGFjLnZhbHVlLFxyXG4gICAgICAgICAgICBpZDogSURcclxuICAgICAgICB9XHJcbiAgICAgICAgb2Jqcy5mb3JFYWNoKG9iaiA9PiB7XHJcbiAgICAgICAgICAgIC8vIG9ubHkgYWRkIGZpZWxkIG9iamVjdHNcclxuICAgICAgICAgICAgaWYgKG9iai52YWx1ZSAmJiBvYmoudmFsdWUgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgIGRhdGFbb2JqLmlkXSA9IG9iai52YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIC8vIHB1dCBkYXRhXHJcbiAgICAgICAgLy8gaWYgdGhlIGlkIGlzIGVtcHR5LCB0aGVuIHBvc3QgZGF0YVxyXG4gICAgICAgIGlmIChkYXRhLmlkKSB7XHJcbiAgICAgICAgICAgIHB1dERhdGEoZGF0YSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcG9zdERhdGEoZGF0YSlcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5oYW5kbGVDYW5jZWxFZGl0UHJlc3NlZCgpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBzZXQgaW5pdGlhbCBlZGl0b3Igc3RhdGVcclxuICAgIGhhbmRsZUNhbmNlbEVkaXRQcmVzc2VkOiBmdW5jdGlvbiAobm90b2dnbGU9ZmFsc2UpIHtcclxuICAgICAgICB2YXIgb2JqcyA9IERPTSgnZWRpdG9yX29iamVjdHMnKTtcclxuICAgICAgICBvYmpzLmlubmVySFRNTCA9IFwiPGlucHV0IHR5cGU9J3RleHQnIGRpc2FibGVkPlwiO1xyXG4gICAgICAgIFxyXG4gICAgICAgIERPTSgnZWRpdG9yX2lkJykudmFsdWUgPSBcIlwiO1xyXG5cclxuICAgICAgICBpZiAoIW5vdG9nZ2xlKSB7XHJcbiAgICAgICAgICAgIHRvZ2dsZUVkaXRvcklucHV0cyh0cnVlLCBcIlwiLCBcIlwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZGVsZXRlIGJ1dHRvblxyXG4gICAgICAgIERPTSgnbG9zX2InKS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgRE9NKCdsb3NfYicpLmNsYXNzTGlzdC5yZW1vdmUoXCJmYWRlLWluXCIpXHJcblxyXG4gICAgICAgIERPTSgnbG9zX2EnKS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgRE9NKCdsb3NfYScpLmNsYXNzTGlzdC5yZW1vdmUoXCJmYWRlLWluXCIpXHJcblxyXG4gICAgICAgIERPTSgnbG9zX2MnKS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgRE9NKCdsb3NfYycpLmNsYXNzTGlzdC5yZW1vdmUoXCJmYWRlLWluXCIpXHJcblxyXG4gICAgICAgIERPTSgnZWRpdG9yX3BsYWNlJykuY2xhc3NMaXN0LnJlbW92ZSgnZXJyb3ItZmllbGQnKVxyXG4gICAgICAgIERPTSgnZWRpdG9yX2RheScpLmNsYXNzTGlzdC5yZW1vdmUoJ2Vycm9yLWZpZWxkJylcclxuICAgICAgICBET00oJ2VkaXRvcl9tb250aCcpLmNsYXNzTGlzdC5yZW1vdmUoJ2Vycm9yLWZpZWxkJylcclxuICAgICAgICBET00oJ2VkaXRvcl95ZWFyJykuY2xhc3NMaXN0LnJlbW92ZSgnZXJyb3ItZmllbGQnKVxyXG5cclxuICAgIH0sXHJcblxyXG4gICAgLy8gY3JlYXRlIGEgbmV3IGVudHJ5XHJcbiAgICBoYW5kbGVOZXdFbnRyeTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuaGFuZGxlQ2FuY2VsRWRpdFByZXNzZWQoKTtcclxuICAgICAgICBET00oJ2xvc19iJykuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBvYmpzID0gRE9NKCdlZGl0b3Jfb2JqZWN0cycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIG9ianMuaW5uZXJIVE1MID0gJzxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwiZXZlbnRfb2JqMVwiPic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgRE9NKCdlZGl0b3JfaWQnKS52YWx1ZSA9IFwiXCI7XHJcblxyXG4gICAgICAgIHRvZ2dsZUVkaXRvcklucHV0cyhmYWxzZSwgXCJcIiwgXCJcIik7XHJcblxyXG4gICAgICAgIGVkaXRPYmplY3RDb3VudCA9IDE7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBkZWxldGUgZW50cnkgaW4gdGhlIGVkaXRvclxyXG4gICAgaGFuZGxlRGVsZXRlRW50cnk6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBjb25zdCBJRCA9IERPTSgnZWRpdG9yX2lkJykudmFsdWUuc3BsaXQoJ18nKVsyXTtcclxuICAgICAgICBpZiAoSUQpIHtcclxuICAgICAgICAgICAgZGVsZXRlRGF0YShJRClcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5oYW5kbGVDYW5jZWxFZGl0UHJlc3NlZCgpXHJcbiAgICB9LFxyXG5cclxuICAgIGhhbmRsZVBhZ2VCdXR0b246IGZ1bmN0aW9uIChpc1BsdXMpIHtcclxuICAgICAgICBwYWdlTWFuYWdlci5oYW5kbGVQYWdlQnV0dG9uKGlzUGx1cylcclxuICAgIH0sXHJcblxyXG4gICAgLy8gY2hlY2sgZm9yIG1pbiBtYXggdmFsdWVzIGZvciBkYXRlc1xyXG4gICAgY2hlY2tNaW5NYXg6IGZ1bmN0aW9uIChlbGVtKSB7XHJcbiAgICAgICAgY29uc3QgbWF4ID0gcGFyc2VJbnQoZWxlbS5tYXgpXHJcbiAgICAgICAgY29uc3QgbWluID0gcGFyc2VJbnQoZWxlbS5taW4pXHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGVsZW0udmFsdWUgPD0gbWF4ICYmIGVsZW0udmFsdWUgPj0gbWluKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGVsZW0udmFsdWUgPCBtaW4pIHtcclxuICAgICAgICAgICAgZWxlbS52YWx1ZSA9IG1pblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGVsZW0udmFsdWUgPiBtYXgpIHtcclxuICAgICAgICAgICAgZWxlbS52YWx1ZSA9IG1heFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gb2JqRXhwb3J0XHJcbiIsIi8vIGZpbGwgdGhlIHBhZ2UgZGljdGlvbmFyeVxyXG52YXIgY3VycmVudFBhZ2U7XHJcbnZhciBwYWdlcztcclxuZnVuY3Rpb24gZmlsbFBhZ2VzIChwYWdlTnVtLCBsYXN0SW5kZXgpIHtcclxuICAgIHBhZ2VzW3BhZ2VOdW1dID0gbGFzdEluZGV4XHJcbn1cclxuXHJcbi8vIGhpZGUgdGhlIGNvcnJlY3QgaXRlbXNcclxuZnVuY3Rpb24gaGlkZU90aGVyUGFnZXMgKCkge1xyXG4gICAgY29uc3QgaXRlbXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGlzdCcpLmNoaWxkcmVuO1xyXG4gICAgY29uc3QgaXRlbXNOdW0gPSBpdGVtcy5sZW5ndGg7XHJcblxyXG4gICAgdmFyIGZpcnN0T2ZQYWdlID0gLTE7XHJcbiAgICB2YXIgbGFzdE9mUGFnZSA9IHBhZ2VzW2N1cnJlbnRQYWdlXTtcclxuICAgIFxyXG4gICAgLy8gaWYgcHJldmlvdXMgcGFnZSBleGlzdHNcclxuICAgIGlmIChwYWdlc1tjdXJyZW50UGFnZS0xXSAhPSBudWxsKSB7XHJcbiAgICAgICAgZmlyc3RPZlBhZ2UgPSBwYWdlc1tjdXJyZW50UGFnZS0xXSArIDFcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZmlyc3RPZlBhZ2UgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXNOdW07IGkrKykge1xyXG4gICAgICAgIGlmIChpIDwgZmlyc3RPZlBhZ2UgfHwgaSA+IGxhc3RPZlBhZ2UpIHtcclxuICAgICAgICAgICAgaXRlbXNbaV0uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGl0ZW1zW2ldLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vLyBkaXNwbGF5IG51bWJlciBvZiBwYWdlcyBhbmQgY3VycmVudCBwYWdlXHJcbmZ1bmN0aW9uIHBhZ2VTdGF0dXMgKCkge1xyXG4gICAgdmFyIHN0YXR1cyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYWdlX3N0YXR1cycpO1xyXG4gICAgdmFyIHNpemUgPSAwO1xyXG4gICAgdmFyIGtleTtcclxuICAgIGZvciAoa2V5IGluIHBhZ2VzKSB7XHJcbiAgICAgICAgaWYgKHBhZ2VzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgc2l6ZSsrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIG1zZyA9IGN1cnJlbnRQYWdlICsgXCIgb2YgXCIgKyBzaXplO1xyXG4gICAgc3RhdHVzLmlubmVyVGV4dCA9IG1zZztcclxufVxyXG5cclxuLy8gZGlzcGxheSB0aGUgaXRlbXMgdGhhdCBmaXQgb24gdGhlIHdpbmRvdywgd2l0aG91dCBzY3JvbGxpbmdcclxuZnVuY3Rpb24gY2hlY2tIZWlnaHQgKCkge1xyXG4gICAgLy8gY2FsYyB0aGUgd2luZG93IGhlaWdodCB0byBmaXQgYSBtYXhpbWFsIGFtb3VudCBvZiBpdGVtc1xyXG4gICAgY29uc3Qgd2luSGVpID0gd2luZG93LmlubmVySGVpZ2h0IC0gMTQwO1xyXG5cclxuICAgIGNvbnN0IGxpc3RJdGVtcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsaXN0JykuY2hpbGRyZW47XHJcbiAgICBjb25zdCBpdGVtc051bSA9IGxpc3RJdGVtcy5sZW5ndGg7XHJcblxyXG4gICAgdmFyIGl0ZW1zSGVpZ2h0ID0gMDtcclxuICAgIHZhciBwYWdlTnVtID0gMTtcclxuICAgIFxyXG4gICAgY3VycmVudFBhZ2UgPSAxO1xyXG4gICAgcGFnZXMgPSB7fTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zTnVtOyBpKyspIHtcclxuICAgICAgICAvLyBzaG93IHRoZW0gYWxsIGFnYWluLCB0byBiZSBtZXNzdXJlZFxyXG4gICAgICAgIGxpc3RJdGVtc1tpXS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgICAgIHZhciBoID0gbGlzdEl0ZW1zW2ldLm9mZnNldEhlaWdodDtcclxuICAgICAgICBpdGVtc0hlaWdodCArPSBoO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIGlmIHRoZSBpdGVtcyBoZWlnaHQgaXMgYmlnZ2VyIHRoYW4gdGhlIHdpbmRvd1xyXG4gICAgICAgIC8vIHRoZW4gYXNpZ24gdGhlbSB0byBhIGRpZmZlcmVudCBwYWdlXHJcbiAgICAgICAgaWYgKGl0ZW1zSGVpZ2h0ID49IHdpbkhlaSkge1xyXG4gICAgICAgICAgICBmaWxsUGFnZXMocGFnZU51bSwgKGkgLSAxKSk7XHJcbiAgICAgICAgICAgIGl0ZW1zSGVpZ2h0ID0gaDtcclxuICAgICAgICAgICAgcGFnZU51bSsrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaSA9PT0gaXRlbXNOdW0gLSAxKSB7XHJcbiAgICAgICAgICAgIGZpbGxQYWdlcyhwYWdlTnVtLCBpKTtcclxuICAgICAgICAgICAgcGFnZU51bSsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICAvLyBoaWRlIGl0ZW1zIGFmdGVyIHRoZSBsYXN0IGl0ZW0gb2YgdGhlIHBhZ2VcclxuICAgIGhpZGVPdGhlclBhZ2VzKCk7XHJcbiAgICAvLyBzaG93IG51bWJlciBvZiBwYWdlcyBhbmQgY3VycmVudCBvbmVcclxuICAgIHBhZ2VTdGF0dXMoKTtcclxuICAgIFxyXG59XHJcbi8vIGhhbmRsZSBidXR0b25zIG5leHQgcGFnZSBhbmQgcHJldmlvdXMgcGFnZVxyXG5mdW5jdGlvbiBoYW5kbGVQYWdlQnV0dG9uIChpc1BsdXMpIHtcclxuICAgIFxyXG4gICAgaWYgKGlzUGx1cykge1xyXG4gICAgICAgIGNvbnN0IG5leHQgPSBjdXJyZW50UGFnZSArIDE7XHJcblxyXG4gICAgICAgIGlmIChuZXh0IGluIHBhZ2VzKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRQYWdlID0gbmV4dDtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IHByZXYgPSBjdXJyZW50UGFnZSAtIDE7XHJcblxyXG4gICAgICAgIGlmIChwcmV2IGluIHBhZ2VzKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRQYWdlID0gcHJldjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaGlkZU90aGVyUGFnZXMoKTtcclxuICAgIHBhZ2VTdGF0dXMoKTtcclxufVxyXG5cclxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGNoZWNrSGVpZ2h0KCk7XHJcbn1cclxuXHJcbnZhciByZXNpemVyO1xyXG53aW5kb3cub25yZXNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjbGVhclRpbWVvdXQocmVzaXplcilcclxuICAgICByZXNpemVyID0gdGhpcy5zZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICBjaGVja0hlaWdodCgpO1xyXG4gICAgfSwgMjAwKVxyXG5cclxufVxyXG5cclxuZXhwb3J0cy5jaGVja0hlaWdodCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGNoZWNrSGVpZ2h0KClcclxufVxyXG5cclxuZXhwb3J0cy5oYW5kbGVQYWdlQnV0dG9uID0gZnVuY3Rpb24gKGlzUGx1cykge1xyXG4gICAgaGFuZGxlUGFnZUJ1dHRvbihpc1BsdXMpXHJcbn0gXHJcbiJdfQ==
