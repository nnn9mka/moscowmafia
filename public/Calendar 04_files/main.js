(async function($) {
	"use strict";

    var event_data={}
    let event = await fetch('/getDateEvent')
    .then(res => (res.json()))
    event_data.events = event;
    //let metro = []
    let metro = await $.getJSON('/static/Calendar 04_files/metro.json');
    // console.log(metro)

	// Setup the calendar with the current date
$(document).ready(async function(){
    renderStation('')
    var date = new Date();
    var today = date.getDate();
    // Set click handlers for DOM elements
    $(".right-button").click({date: date}, next_year);
    $(".left-button").click({date: date}, prev_year);
    $(".month").click({date: date}, month_click);
    $("#add-button").click({date: date}, new_event);
    // Set current month as active
    $(".months-row").children().eq(date.getMonth()).addClass("active-month");
    init_calendar(date);
    var events = check_events(today, date.getMonth()+1, date.getFullYear());
    show_events(events, months[date.getMonth()], today);

    $(document).on('click','.event-card', function(){
        if($(this).data('id') != undefined){
            window.location.href += '/'+$(this).data('id')
        }
        
    })

    // $('#logout').click(()=>{
    //     document.cookie = "token="
    //     document.location.reload();
    // })

    $('#metro_station').click(()=>{
        $('#metro_modal').modal('show')
    })
    $('#close_metro').click(()=>{
        $('#metro_modal').modal('hide');
        $('#metro_station').val("")
    })
    $('#select_metro').click(()=>{
        
        if($('#metro_station').val().trim().length===0 || $('#search_station').data("id") == undefined || metro[$('#search_station').data("id")].name != $('#search_station').val()){
            $('.chacked').removeClass('chacked')
            $('#search_station').addClass("is-invalid");
            return;
        }
        //console.log("м."+metro[$('#search_station').data("id")].name);
        $('#metro_modal').modal('hide');
    })
    
    $(document).on('click', '.delete-group', function(){
        let del = confirm('При удалении данного мероприятия будут удалены все данные!')
        if(del){
            document.location = "/timetable/delete/group/"+$(this).data('id');
        }
        return;
        console.log($(this).data('id'));
    });
    
    $(document).on('click', '.station', function()
    {
        let data = metro[$(this).data('id')];
        $('#search_station').val(data.name)
        $('#search_station').data("id",$(this).data('id'))
        $('.search').addClass('chacked')
        $('.chacked').css('--myvar',data.hex)
        //$('.search').addClass('chacked')
        
        //$('#search_station').data(data.name)
        $('.is-invalid').removeClass("is-invalid");
        $('.modal-body .list').html(`<div class="station" data-id="${$(this).data('id')}">
        <div style="background-color: ${data.hex};"></div>
        <span>${data.name}</span>
      </div>`)
      $('#metro_station').val("м."+data.name)
      $('#metro_station').data("hex", data.hex)
    });

    $('#search_station').on('keyup',function(){
        var $this = $(this),
            val = $this.val().toLowerCase();

        
        renderStation(val)
        
    });

    $('#search_station').on('click',function(){
        $('.is-invalid').removeClass("is-invalid");
        
    });

    
});


function renderStation(val){
    var opt = '';
    metro.map((data, num)=>{
        if(data.name.toLowerCase().match(val)!=null && data.name.toLowerCase().match(val).index==0){
            opt += (`<div class="station" data-id="${num}">
            <div style="background-color: ${data.hex};"></div>
            <span>${data.name}</span>
          </div>`)
        }
    })
    
    if(opt){
        $('.modal-body .list').html(opt)
    }else{
        $('.modal-body .list').html("Ничего не найдено!")
    }
}



// Initialize the calendar by appending the HTML dates
async function init_calendar(date) {

    

    $(".tbody").empty();
    $(".events-container:last-child").empty();
    var calendar_days = $(".tbody");
    var month = date.getMonth();
    var year = date.getFullYear();
    var day_count = days_in_month(month, year);
    var row = $("<tr class='table-row'></tr>");
    var today = date.getDate();
    // Set date to 1 to find the first day of the month
    date.setDate(1);
    var first_day = date.getDay();
    // 35+firstDay is the number of date elements to be added to the dates table
    // 35 is from (7 days in a week) * (up to 5 rows of dates in a month)
    for(var i=0; i<35+first_day; i++) {
        // Since some of the elements will be blank, 
        // need to calculate actual date from index
        var day = i-first_day+1;
        // If it is a sunday, make a new row
        if(i%7===0) {
            calendar_days.append(row);
            row = $("<tr class='table-row'></tr>");
        }
        // if current index isn't a day in this month, make it blank
        if(i < first_day || day > day_count) {
            var curr_date = $("<td class='table-date nil'>"+"</td>");
            row.append(curr_date);
        }   
        else {
            var curr_date = $("<td class='table-date'>"+day+"</td>");
            var events = check_events(day, month+1, year);
            if(today===day && $(".active-date").length===0) {
                curr_date.addClass("active-date");
                show_events(events, months[month], day);
            }
            // If this date has any events, style it with .event-date
            if(events.length!==0) {
                curr_date.addClass("event-date");
            }
            // Set onClick handler for clicking a date
            curr_date.click({events: events, month: months[month], day:day}, date_click);
            row.append(curr_date);
        }
    }
    // Append the last row and set the current year
    calendar_days.append(row);
    $(".year").text("Расписание("+year+")");
}

// Get the number of days in a given month/year
function days_in_month(month, year) {
    var monthStart = new Date(year, month, 1);
    var monthEnd = new Date(year, month + 1, 1);
    return (monthEnd - monthStart) / (1000 * 60 * 60 * 24);    
}

// Event handler for when a date is clicked
function date_click(event) {
    $(".events-container:last-child").show(250);
    $("#dialog").hide(250);
    $(".active-date").removeClass("focusDate");
    $(".active-date").removeClass("active-date");
    
    $(this).addClass("active-date");
    $(this).addClass("focusDate");
    show_events(event.data.events, event.data.month, event.data.day);
};

// Event handler for when a month is clicked
function month_click(event) {
    $(".events-container:last-child").show(250);
    $("#dialog").hide(250);
    var date = event.data.date;
    $(".active-month").removeClass("active-month");
    $(this).addClass("active-month");
    var new_month = $(".month").index(this);
    date.setMonth(new_month);
    init_calendar(date);
}

// Event handler for when the year right-button is clicked
function next_year(event) {
    $("#dialog").hide(250);
    var date = event.data.date;
    var new_year = date.getFullYear()+1;
    $("year").html(new_year);
    date.setFullYear(new_year);
    init_calendar(date);
}

// Event handler for when the year left-button is clicked
function prev_year(event) {
    $("#dialog").hide(250);
    var date = event.data.date;
    var new_year = date.getFullYear()-1;
    $("year").html(new_year);
    date.setFullYear(new_year);
    init_calendar(date);
}

// Event handler for clicking the new event button
function new_event(event) {
    // if a date isn't selected then do nothing
    if($(".active-date").length===0)
        return;
    // remove red error input on click
    $("input").click(function(){
        $(this).removeClass("error-input");
    })
    // empty inputs and hide events
    $("#dialog input[type=text]").val('');
    $("#dialog input[type=number]").val('');
    $(".events-container:last-child").hide(250);
    $("#dialog").show(250);
    // Event handler for cancel button
    $("#cancel-button").click(function() {
        $("#name").removeClass("error-input");
        $("#metro_station").removeClass("error-input");
        $("#dialog").hide(250);
        $(".events-container:last-child").show(250);
    });
    // Event handler for ok button
    $("#ok-button").unbind().click({date: event.data.date},async function() {
        var date = event.data.date;
        var name = $("#name").val().trim();
        var metro = $("#metro_station").val().trim();
        var day = parseInt($(".active-date").html());
        // Basic form validation
        if(name.length === 0) {
            $("#name").addClass("error-input");
        }
        else if(metro.length === 0) {
            $("#metro_station").addClass("error-input");
        }
        else {
            $("#dialog").hide(250);
            //console.log(count);

            await fetch('/newDateEvent', {
                method:'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body:JSON.stringify({
                    "occasion": name,
                    "invited_count": metro,
                    "year": date.getFullYear(),
                    "month": date.getMonth()+1,
                    "day": day,
                    'hex':$("#metro_station").data('hex')
                })
            }).then(data=>{
                return data.json();
            })
            .then(res=>{
                console.log(res.insertId);
                new_event_json(res.insertId ,name, metro, date, day, $("#metro_station").data('hex'));
                date.setDate(day);
                init_calendar(date);
            })

            
        }
    });
}

// Adds a json event to event_data
function new_event_json(id, name, count, date, day, hex) {
    var event = {
        'id':id,
        "occasion": name,
        "invited_count": count,
        "year": date.getFullYear(),
        "month": date.getMonth()+1,
        "day": day,
        'hex': hex
    };
    event_data["events"].push(event);
}

// Display all events of the selected date in card views
function show_events(events, month, day) {
    // Clear the dates container
    $(".events-container:last-child").empty();
    $(".events-container:last-child").show(250);
    console.log(event_data["events"]);
    $('.data_view').html(`${month} ${day}`)
    // If there are no events for this date, notify the user
    if(events.length===0) {
        var event_card = $("<div class='event-card'></div>");
        var event_name = $("<div class='event-name'>Мероприятий на "+month+" "+day+" нет.</div>");
        $(event_card).css({ "border-left": "10px solid #FF1744" });
        $(event_card).append(event_name);
        $(".events-container:last-child").append(event_card);
    }
    else {
        
        // Go through and add each event as a card to the events container
        for(var i=0; i<events.length; i++) {
            var event_card = $(`<div class='event-card' style="position:relative; margin:0px" data-id='${events[i]['id']}'>
            
            </div>`);
            var event_name = $("<div class='event-name'>"+events[i]["occasion"]+":</div>");
            var event_count = $("<div class='event-count'>"+events[i]["invited_count"]+" Invited</div>");
            if(events[i]["cancelled"]===true) {
                $(event_card).css({
                    "border-left": "10px solid #FF1744"
                });
                event_count = $("<div class='event-cancelled'>Cancelled</div>");
            }
            // $(event_card).append(event_name).append(event_count);
            $(event_card).append(`<div style="
            display: flex;
            align-items: center;
            padding-left: 5px;
            padding-right: 5px;
            margin-bottom: 5px;
            ">
            
              <div class="" style="
              color: #7f31f5;
              background-color: #ebebeb;
              font-weight: bold;
              padding: 10px;
              margin-right: 10px;
              border-radius: 25px;
              ">${events[i]["occasion"]}</div>
            <div class="" style="
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
        "><div style="background-color: ${events[i]["hex"]? events[i]["hex"] : 'blue'};
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 7px;"></div>${events[i]["invited_count"]}</div></div>

            <div style="
            display: flex;
            justify-content: space-around;
        ">
            <div>Учатников: 30</div>
                ${events[i]['status_game'] == 1? '<div style="color: green;">Статус: игра началась</div>' : '<div>Статус: в ожидании</div>'}
            </div>`)
            $(".events-container:last-child").append(`<div style="position:relative; margin:10px">
            <i class="fas fa-times delete-group" data-id="${events[i]['id']}" style="    position: absolute;
            top: 0;
            right: 0;
            background-color: red;
            padding: 10px;
            border-top-right-radius: 10px;
            border-bottom-left-radius: 10px;
            color: white; z-index:22"></i>
            
            
            `+event_card[0].outerHTML+'</div>');
            console.log(event_card[0].outerHTML);
        }
    }
}

// Checks if a specific date has any events
function check_events(day, month, year) {
    var events = [];
    for(var i=0; i<event_data["events"].length; i++) {
        var event = event_data["events"][i];
        if(event["day"]===day &&
            event["month"]===month &&
            event["year"]===year) {
                events.push(event);
            }
    }
    return events;
}

// Given data for events in JSON format
// var event_data = {
//     "events": [
//     {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10,
//         "cancelled": true
//     },
//     {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10,
//         "cancelled": true
//     },
//         {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10,
//         "cancelled": true
//     },
//     {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10
//     },
//         {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10,
//         "cancelled": true
//     },
//     {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10
//     },
//         {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10,
//         "cancelled": true
//     },
//     {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10
//     },
//         {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10,
//         "cancelled": true
//     },
//     {
//         "occasion": " Repeated Test Event ",
//         "invited_count": 120,
//         "year": 2020,
//         "month": 5,
//         "day": 10
//     },
//     {
//         "occasion": " Test Event",
//         "invited_count": 120,
//         "year": 2021,
//         "month": 10,
//         "day": 11,
//         "cancelled": true
//     }
//     ]
// };

const months = [ 
    'Январь', 
    'Февраль',
    'Март', 
    'Апрель', 
    'Май', 
    'Июнь', 
    'Июль', 
    'Август', 
    'Сентябрь', 
    'Октябрь', 
    'Ноябрь', 
    'Декабрь'
];

})(jQuery);
