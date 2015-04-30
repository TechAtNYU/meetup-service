'use strict';

var adminMeetupKey = process.env.MeetupKey;
var apiKey = process.env.TNYUAPIKey;
var meetup = require('./lib/meetup')(adminMeetupKey);
var request = require('request');
var teamIdToName = {};
var delay = 100000;
var apiLink = 'https://api.tnyu.org/v1.0/';
var hit = false;
var meetupTeams = {
	//Name -> www.meetup.com/blah
	'Hack Days': 'nyhackdays',
	'Game Days': 'gamedays',
	'Demo Days': 'DemoDays'
};

request({
	'rejectUnauthorized': false,
	'url': apiLink + 'teams',
	'headers': {
		'x-api-key': apiKey
	},
	timeout: delay
}, function(err, response, body) {
	var apiJson = JSON.parse(body);
	var teams = apiJson.teams;

	teams.forEach(function(team) {
		if (team.name in meetupTeams) {
			teamIdToName[team.id] = team.name;
		}
	});

	request({
		'rejectUnauthorized': false,
		'url': apiLink + 'events',
		'headers': {
			'x-api-key': apiKey
		},
		timeout: delay
	}, function(err, response, body) {
		var apiJson = JSON.parse(body);
		var events = apiJson.events;
		var teamIds;
		events.forEach(function(event) {
			if ('links' in event && 'teams' in event.links) {
				teamIds = event.links.teams;
				teamIds.forEach(function(teamId) {
					if (teamId in teamIdToName) {
						//If event is not a placeholder and has no rsvp url
						eventHandler(event, teamId);
					}
				});
			}
		});
	});
});

var eventHandler = function(event, teamId) {
	if (!event.isPlaceholder) {
		pushMeetupEvent(event, teamId);
	}
};
var pushMeetupEvent = function(event, tnyugroupid) {
	if (hit) {
		return;
	}

	hit = true;
	tnyugroupname = teamIdToName[tnyugroupid];
	var title = event.title;
	var	description = event.description;
	var	details = event.details;
	var	tnyuvenueid = event.links.venue;
	var	startDateTime = event.startDateTime;
	var	endDateTime = event.endDateTime;
	var	tnyugroupname = teamIdToName[tnyugroupid];
	var	meetupurl = meetupTeams[tnyugroupname];
	var meetupdescription = '<p>' + description + '</p>';
	var	meetupgroupid;
	var	meetupdetails = '<p>' + details + '</p>';

	getTnyuVenue(tnyuvenueid, function(data) {
		var venue = data;
		var startepoch = new Date(startDateTime).getTime();
		var endepoch = new Date(endDateTime).getTime();
		var duration = endepoch - startepoch;
		var eventtext = meetupdescription + meetupdetails;

		getMeetupVenueId(venue, meetupurl, function(data) {
			var meetupvenueid = data;
			console.log(data);
			console.log(title);
			console.log(startepoch);
			meetup.getGroupById({
				'urlname': meetupurl
			}, function(err, response) {
				meetupgroupid = response.id;
				meetup.postEvent({
					'description': eventtext,
					'duration': duration,
					'groupid': meetupgroupid,
					'groupurlname': meetupurl,
					'name': title,
					'publishstatus': 'draft',
					'time': startepoch * 1000,
					'venueid': meetupvenueid,
				}, function(err, response) {
					console.log(response);
				});
			});
		});
	});
};

var deleteMeetupEvent = function(event, tnyuGroupId) {
	var tnyugroupname = teamIdToName[tnyuGroupId];
	var meetupurl = meetupTeams[tnyugroupname];
	meetup.getEvents({
		groupurlname: meetupurl
	}, function(err, response) {
		console.log(response);
	});
};

var getTnyuVenue = function(venueid, callback) {
	request({
		'rejectUnauthorized': false,
		'url': apiLink + 'venues' + '/' + venueid,
		'headers': {
			'x-api-key': apiKey
		},
		timeout: delay
	}, function(err, response, body) {
		var apiJson = JSON.parse(body);
		var venue = apiJson.venues;

		callback(venue);
	}, function(err) {
		console.log(err);
	});
};

var getMeetupVenueId = function(venue, groupUrl, callback) {
	var parsedVenues = venue.address.split(',');
	var meetupVenueId;
	meetup.createVenue({
		'urlname': groupUrl,
		'address1': parsedVenues[0],
		'city': 'New York',
		'name': venue.name,
		'state': 'NY',
		'country': 'US'
	}, function(err, response) {
		if ('errors' in response) {
			if ('code' in response.errors[0] && response.errors[0].code === 'venueerror') {
				meetupVenueId = response.errors[0].potentialmatches[0].id;
			}
		} else {
			meetupVenueId = response.id;
		}
		callback(meetupVenueId);
	});
};
