/**
 * This is the driving code for the Alexa skill. This is the portion that runs the code
 * once a user has given Alexa a specific input.
 * 
 * First, it checks for correct permissions. If none are granted, it gives the user a card.
 * It then searches the user's lists in order to obtain the token stored in the list LifxToken.
 * If no error occurs, it creates a timer and changes the user's lights.
 * 
 * In the event of an error, it will log it to the CloudWatch log.
 */
const Alexa = require('ask-sdk-core');
const axios = require('axios');
const moment = require('moment');

// Setting empty strings to set User token to
let lifxListId = '';
let LifxToken = '';

// Timer Item object that communicates with Alexa API to set timer
const timerItem = {
    duration: 'PT15S',
    timerLabel: 'demo',
    creationBehavior: {
        displayExperience: {
            visibility: 'VISIBLE'
        }
    },
    triggeringBehavior: {
        operation: {
            type: 'ANNOUNCE',
            textToAnnounce: [{
                locale: 'en-US',
                text: 'This ends your timer.'
            }]
        },
        notificationConfig: {
            playAudible: true
        }
    }
};

// This it the object that is passed to Lifx RESTful API to set duration of light as well as colors
const lifxItem = {
    color: 'blue',
    from_color: 'purple',
    period: 10,
    cycles: 3,
    persist: false,
    power_on: true,
    peak: 1
};

// Easter Egg that inults user if they invoke ToastModeIntent
const ToastModeResponses = ['Silence, comb boy',
    'I\'d rather manage memory in C than spend a day with you',
    'You look like shell',
    'You aren\'t worthy of the toast. You\'re more like a burnt tortilla',
    'Calm down popcorn kernel. You\'re not quite popped yet',
    'Finding reasons to like you is like finding the right semicolon in javascript',
    'Are you Betty? Because you haunt my code to this day',
    'What\'s wrong, did Betty hurt you?'
];

/* The launchRequestHandler handles the inital invocation when lumi cue is invoked.
*  This also handles permissions set to allow the use of Timers API as well as the Alexa's list API
*/
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const {
            permissions
        } = handlerInput.requestEnvelope.context.System.user;

        // Grab token from LifxToken user list and save as LifxToken
        const options = {
            headers: {
                Authorization: `Bearer ${Alexa.getApiAccessToken(handlerInput.requestEnvelope)}`,
                'Content-Type': 'application/json'
            }
        };
        // If permissions aren't granted to access lists, prompt user with card to enable permissions
        if (!permissions) {
            const permissions = ['read::alexa:household:list', 'alexa::alerts:timers:skill:readwrite'];
            handlerInput.responseBuilder
                .speak('This skill needs permission to access your timers and lists.')
                .withAskForPermissionsConsentCard(permissions)
                .getResponse();

        } else {
            // Once permissions granted, access list and parse for Lifx token
            const apiEndpoint = 'https://api.amazonalexa.com/v2/householdlists/';

            await axios.get(apiEndpoint, options)
                .then(response => {
                    // nameCheck used as bool to see if name matches 'LifxToken'
                    let nameCheck = 0;
                    const ListResponse = response.data;
                    // Getting list of Alexa lists in dict form
                    const listLists = Object.values(ListResponse)[0];

                    for (let itr = 0; itr < listLists.length; itr++) {
                        // Iterating through lists made of key, value pairs
                        for (let inneritr = 0; inneritr < Object.entries(listLists[itr]).length; inneritr++) {
                            // Checking name of ListResponse
                            if (Object.entries(listLists[itr])[inneritr][0] === 'name') {
                                if (Object.entries(listLists[itr])[inneritr][1] === 'LifxToken') {
                                    nameCheck = 1;
                                }
                            }
                        }
                        if (nameCheck === 1) {
                            // If name is LifxToken, find listId and set lifxListId token to its value
                            console.log(listLists[itr]);
                            for (let inneritr = 0; inneritr < Object.entries(listLists[itr]).length; inneritr++) {
                                // Checking name of ListResponse
                                if (Object.entries(listLists[itr])[inneritr][0] === 'listId') {
                                    // Setting the corresponding list ID to help obtain list token
                                    lifxListId = Object.entries(listLists[itr])[inneritr][1];
                                }
                            }
                        }
                    }
                })
                // Catch errors
                .catch(error => {
                    console.log(error);
                });
            // Setting HTTPS URL for API Get request to grab the list object
            let listDest = 'https://api.amazonalexa.com/v2/householdlists/' + lifxListId + '/active';
            // Once list found, search values of list for token
            await axios.get(listDest, options)
                .then(response => {
                    handlerInput.responseBuilder
                    let listLists = Object.values(response['data']);
                    // Looping through list of lists to get Token from object
                    for (let itr = 0; itr < listLists[0].length; itr++) {
                        // Checking name of ListResponse
                        for (let inneritr = 0; inneritr < Object.entries(listLists[0][itr]).length; inneritr++) {
                            if (Object.entries(listLists[0][itr])[inneritr][0] === 'value') {
                                LifxToken = Object.entries(listLists[0][itr])[inneritr][1];
                            }
                        }
                    }
                });
            // Prompt user with first instructions
            handlerInput.responseBuilder
                .speak('Welcome to lumi cue! You can say set timer')
                .reprompt('You can say set laundry timer');
        }
        // Handle user response
        return handlerInput.responseBuilder
            .getResponse();
    }
};
/* 
* This handles the connections and the right permissions for the Alexa Skill
*/
const ConnectionsResponsetHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response';
    },
    handle(handlerInput) {
        const {
            permissions
        } = handlerInput.requestEnvelope.context.System.user;

        const status = handlerInput.requestEnvelope.request.payload.status;
        // If no permissions granted, prompt user for permissions to read lists to and create and modify timers
        if (!permissions) {
            const permissions = ['read::alexa:household:list', 'alexa::alerts:timers:skill:readwrite'];
            handlerInput.responseBuilder
                .speak('This skill needs permission to access your timers and lists.')
                .withAskForPermissionsConsentCard(permissions)
                .getResponse();
        }
        // Handle user's response to request for permissions
        switch (status) {
            // If user grants permissions, prompt to set timer
            case 'ACCEPTED':
                handlerInput.responseBuilder
                    .speak('Now that we have permission to set a timer. You can say set a timer.')
                    .reprompt('would you like to start a timer?');
                break;
            // If user denies permissions, can't proceed with app
            case 'DENIED':
                handlerInput.responseBuilder
                    .speak("Without permissions, I can't set a timer. So I guess that's goodbye.");
                break;
            case 'NOT_ANSWERED':
            // If user does not respond, break
            /* TO-DO: Should we reprompt here instead of just breaking? */
                break;
            default:
                // Default to permissions granted
                handlerInput.responseBuilder
                    .speak('Now that we have permission to set a timer. You can say set a timer.')
                    .reprompt('would you like to start?');
        }
        return handlerInput.responseBuilder
            .getResponse();
    }
};
/* This function communicates with the Alexa Timers API as well as the Lifx API
 * To set a timer that plays off a sound and has the lights on for the duration of the timer
 */
const TimerStartIntentHandler = {
    async canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'TimerStartIntent';
    },
    async handle(handlerInput) {
        // placing corresponding slots to timerItem object
        timerItem.timerLabel = handlerInput.requestEnvelope.request.intent.slots.name.value;
        timerItem.duration = handlerInput.requestEnvelope.request.intent.slots.timeObject.value;

        const duration = moment.duration(timerItem.duration);
        const hours = (duration.hours() > 0) ? `${duration.hours()} ${(duration.hours() === 1) ? 'hour' : 'hours'},` : '';
        const minutes = (duration.minutes() > 0) ? `${duration.minutes()} ${(duration.minutes() === 1) ? 'minute' : 'minutes'} ` : '';
        const seconds = (duration.seconds() > 0) ? `${duration.seconds()} ${(duration.seconds() === 1) ? 'second' : 'seconds'}` : '';

        // we need to check if hours, minutes, seconds exists first
        let lightMinutes = 0;
        if (duration.minutes() > 0) {
            lightMinutes = duration.minutes() * 60;
        }
        let lightHours = 0;
        if (duration.hours() > 0) {
            lightHours = duration.hours() * 3600;
        }
        const lightSeconds = duration.seconds();

        // convert units to lightWaitTime by dividing lightWaitTime by ten to match number the cycles in pulse effect
        const lightWaitTime = (lightHours + lightMinutes + lightSeconds) / 10;
        lifxItem.cycles = lightWaitTime;
        console.log('wait time set to ' + lightWaitTime);

        console.log('wait time set to ' + lightWaitTime);
        // Alexa API
        const options = {
            headers: {
                Authorization: `Bearer ${Alexa.getApiAccessToken(handlerInput.requestEnvelope)}`,
                'Content-Type': 'application/json'
            }
        };
        const apiEndpoint = getApiEndpoint(Alexa.getLocale(handlerInput.requestEnvelope));
        await axios.post(apiEndpoint, timerItem, options)
            .then(response => {
                handlerInput.responseBuilder
                    .speak(`Your ${timerItem.timerLabel} timer is set for ${hours} ${minutes} ${seconds}.`);
            })
            .catch(error => {
                console.log(error);
            });
        // Calls Lifx API to set light state
        const optionsLifx = {
            headers: {
                Authorization: `Bearer ${LifxToken.toLowerCase()}`,
                'Content-Type': 'application/json'
            }
        };

        axios.post('https://api.lifx.com/v1/lights/all/effects/breathe', lifxItem, optionsLifx)
            .then(response => {
                console.log(response);
            })
            .catch(error => {
                console.log('Error is ' + JSON.stringify(error));
            });
        return handlerInput.responseBuilder
            .getResponse();
    }
};
/* This is The Toastbrush Easter Egg that roasts the user
 */
const ToastModeIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'ToastModeIntent';
    },
    handle(handlerInput) {
        const speakReprompt = 'Whats the matter you scared of getting burnt?';
        // Array of custom insults
        const toastArr = ToastModeResponses;
        // Generates random number to use as array index
        const toastIndex = Math.floor(Math.random() * toastArr.length);  
        const randomRoast = toastArr[toastIndex];  
        const speechOutput = 'Welcome, here is your roast ' + randomRoast;

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(speakReprompt)
            .getResponse();
    }
};
/** This handler handles when the user asks alexa for help
 */
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say set a timer';
        const speakReprompt = 'You can say set oven timer';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakReprompt)
            .getResponse();
    }
};

/** This intent is activated whenever the user use the cancle intent word
 */
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Have a Luminous Day!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

/* This ends the session when a user says words like "exit" or "nevermind"
*/
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

/* Tells the user when they toggle a builtin Alexa intent that is not handled by our code
*/
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            // .reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

/* Catches errors, tells the user that there was an error, and logs the error to CloudWatch
*/
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        console.log(`handlerInput.requestEnvelope: ${handlerInput.requestEnvelope}`);
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/* Sets endpoints for Alexa API
*/
function getApiEndpoint(locale) {
    // North America – https://api.amazonalexa.com
    // Europe – https://api.eu.amazonalexa.com
    // Far East – https://api.fe.amazonalexa.com
    const naEndpoint = 'https://api.amazonalexa.com/v1/alerts/timers';
    const euEndpoint = 'https://api.eu.amazonalexa.com/v1/alerts/timers';
    const feEndpoint = 'https://api.fe.amazonalexa.com/v1/alerts/timers';
    let apiEndpoint = naEndpoint;
    switch (locale) {
        case 'de-DE':
            apiEndpoint = euEndpoint;
            break;
        case 'en-AU':
            apiEndpoint = feEndpoint;
            break;
        case 'en-CA':
            apiEndpoint = naEndpoint;
            break;
        case 'en-GB':
            apiEndpoint = euEndpoint;
            break;
        case 'en-IN':
            apiEndpoint = euEndpoint;
            break;
        case 'en-US':
            apiEndpoint = naEndpoint;
            break;
        case 'es-MX':
            apiEndpoint = naEndpoint;
            break;
        case 'es-US':
            apiEndpoint = naEndpoint;
            break;
        case 'fr-CA':
            apiEndpoint = naEndpoint;
            break;
        case 'fr-FR':
            apiEndpoint = euEndpoint;
            break;
        case 'hi-IN':
            apiEndpoint = feEndpoint;
            break;
        case 'it-IT':
            apiEndpoint = euEndpoint;
            break;
        case 'ja-JP':
            apiEndpoint = feEndpoint;
            break;
        case 'pt-BR':
            apiEndpoint = naEndpoint;
            break;
    }
    return apiEndpoint;
}

/* Exports functions to be used by code */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ConnectionsResponsetHandler,
        TimerStartIntentHandler,
        ToastModeIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler
        )
    .addErrorHandlers(
        ErrorHandler
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();