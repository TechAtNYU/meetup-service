'use strict';

var admin_meetup_key = process.env.MeetupKey,
    api_key = proces.env.TNYUAPIKey,
    meetup = require('./lib/meetup')(admin_meetup_key),
    request = require('request'),
    team_id_to_name = {},
    delay = 100000,
    api_link = 'https://api.tnyu.org/v1.0/',
    hit = false,
    meetup_teams = {
        //Name -> www.meetup.com/blah
        'Hack Days': 'nyhackdays',
        'Game Days': 'gamedays',
        'Demo Days': 'DemoDays'
    };

request({
    'rejectUnauthorized': false,
    'url': api_link + 'teams',
    'headers': {
        'x-api-key': api_key
    },
    timeout: delay
}, function(err, response, body) {
    var apiJson = JSON.parse(body),
        teams = apiJson['teams'];

    teams.forEach(function(team) {
        if (team.name in meetup_teams) {
            team_id_to_name[team.id] = team.name;
        }
    });

    request({
        'rejectUnauthorized': false,
        'url': api_link + 'events',
        'headers': {
            'x-api-key': api_key
        },
        timeout: delay
    }, function(err, response, body) {
        var apiJson = JSON.parse(body),
            events = apiJson['events'],
            team_ids;
        events.forEach(function(event) {
            if ('links' in event && 'teams' in event['links']) {
                team_ids = event['links']['teams'];
                team_ids.forEach(function(team_id) {
                    if (team_id in team_id_to_name) {
                        //If event is not a placeholder and has no rsvp url
                        event_handler(event, team_id);
                    }
                });
            }
        });
    });
});

var event_handler = function(event, team_id) {
    if (!event.isPlaceholder /*&& (event.rsvpUrl === 'undefined' || event.rsvpUrl.length < 3)*/ ) {
        push_meetup_event(event, team_id);
    } else {
        //delete_meetup_event(event, team_id);
    }
};
var push_meetup_event = function(event, tnyu_group_id) {
    //post event
    //issue post to api.techatnyu.org updating rsvpUrl.
    //TEST: Only post once
    if (hit) {
        return;
    }

    hit = true;
    tnyu_group_name = team_id_to_name[tnyu_group_id];
    var title = event.title,
        description = event.description,
        details = event.details,
        tnyu_venue_id = event.links.venue,
        cost = event.cost,
        startDateTime = event.startDateTime,
        endDateTime = event.endDateTime,
        tnyu_group_name = team_id_to_name[tnyu_group_id],
        meetup_url = meetup_teams[tnyu_group_name],
        meetup_description = '<p>' + description + '</p>',
        meetup_group_id,
        meetup_details = '<p>' + details + '</p>';

    get_tnyu_venue(tnyu_venue_id, function(data) {
        var venue = data;
        var start_epoch = new Date(startDateTime).getTime();
        var end_epoch = new Date(endDateTime).getTime();
        var duration = end_epoch - start_epoch;
        var event_text = meetup_description + meetup_details;

        console.log(event_text);
        console.log(duration);
        console.log(meetup_url);
        console.log(title);
        console.log(venue);

        get_meetup_venue_id(venue, meetup_url, function(data) {
            var meetup_venue_id = data;
            console.log(data);
            console.log(title);
            console.log(start_epoch);
            meetup.getGroupById({
                'urlname': meetup_url
            }, function(err, response) {
                meetup_group_id = response.id;
                meetup.postEvent({
                    'description': event_text,
                    'duration': duration,
                    'group_id': meetup_group_id,
                    'group_urlname': meetup_url,
                    'name': title,
                    'publish_status': 'draft',
                    'time': start_epoch * 1000,
                    'venue_id': meetup_venue_id,
                }, function(err, response) {
                    //update_tnyu_event(event, response.event_url);
                    console.log(response);
                });
            });
        });
    });
};

var delete_meetup_event = function(event, tnyu_group_id) {
    var tnyu_group_name = team_id_to_name[tnyu_group_id];
    var meetup_url = meetup_teams[tnyu_group_name];
    meetup.getEvents({
        group_urlname: meetup_url
    }, function(err, response) {
        console.log(response);
    });
};

var get_tnyu_venue = function(venue_id, callback) {
    var venue;
    request({
        'rejectUnauthorized': false,
        'url': api_link + 'venues' + '/' + venue_id,
        'headers': {
            'x-api-key': api_key
        },
        timeout: delay
    }, function(err, response, body) {
        var apiJson = JSON.parse(body),
            venue = apiJson['venues'];

        callback(venue);

    }, function(err, response) {
        console.log(err);
    });


};

var get_meetup_venue_id = function(venue, group_url, callback) {
    console.log(venue);
    var meetup_venues,
        parsed_venues = venue.address.split(','),
        meetup_venue_id;
    meetup.createVenue({
        'urlname': group_url,
        'address_1': parsed_venues[0],
        'city': 'New York',
        'name': venue.name,
        'state': 'NY',
        'country': 'US'
    }, function(err, response) {
        if ('errors' in response) {
            if ('code' in response['errors'][0] && response['errors'][0]['code'] === 'venue_error') {
                meetup_venue_id = response['errors'][0]['potential_matches'][0]['id'];
            }
        } else {
            meetup_venue_id = response['id'];
        }
        callback(meetup_venue_id);
    });
};

//meetup.getEvents({'member_id' : 'self'}, function(err,events) { console.log(events); });
//meetup.getGroups({'member_id' : 'self'}, function(err,events) { console.log(events); });

//10494742

//meetup.postEvent({'group_id': '7298422', 'group_urlname': 'http://www.meetup.com/gamedays/',
//				 'name': 'Physics is so kwl'}, function(err, events){
//				 	console.log(events);
//				 });
//meetup.getEvents({'member_id' : 'self'}, function(err,events) { console.log(events); });
//meetup.getGroups({'member_id' : 'self'}, function(err,events) { console.log(events); });

//10494742