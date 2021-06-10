const Alexa = require('ask-sdk-core');
const axios = require('axios');
const moment = require('moment');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

const CarlosToken = process.env.CarlosToken;
let lifxListId = '';
let LifxToken = '';

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
const lifxItem = {
    color: 'blue',
    from_color: 'purple',
    period: 10,
    cycles: 3,
    persist: false,
    power_on: true,
    peak: 1
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
        /* || (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
                    && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'TimerStartIntent')) */
        ;
    },
    async handle(handlerInput) {
        console.log('WE ARE IN LAUNCH INTENT' + JSON.stringify(handlerInput.requestEnvelope));
        const {
            permissions
        } = handlerInput.requestEnvelope.context.System.user;
        const attributesManager = handlerInput.attributesManager;
        // Grab token from LifxToken user list and save as LifxToken
        const options = {
            headers: {
                Authorization: `Bearer ${Alexa.getApiAccessToken(handlerInput.requestEnvelope)}`,
                'Content-Type': 'application/json'
            }
        };
        if (!permissions) {
            /* await handlerInput.responseBuilder
                .speak('This skill needs permission to access your timers and lists.')
                .addDirective({
                  type: 'Connections.SendRequest',
                  name: 'AskFor',
                  payload: {
                    '@type': 'AskForPermissionsConsentRequest',
                    '@version': '1',
                    permissionScope: 'read::alexa:household:list' 'alexa::alerts:timers:skill:readwrite'
                  },
                  token: ''
                }); */
            console.log('About to ask for permissions');
            const permissions = ['read::alexa:household:list', 'alexa::alerts:timers:skill:readwrite'];
            handlerInput.responseBuilder
                .speak('This skill needs permission to access your timers and lists.')
                .withAskForPermissionsConsentCard(permissions)
                .getResponse();
            console.log('permissions sent');
        } else {
            const apiEndpoint = 'https://api.amazonalexa.com/v2/householdlists/';
            console.log('Inside else statment');
            await axios.get(apiEndpoint, options)
                .then(response => {
                    handlerInput.responseBuilder
                        .speak('We grabbed your token!');
                    console.log(response.data);

                    const ListResponse = response.data;
                    // Getting list of Alexa lists in dict form
                    const listLists = Object.values(ListResponse)[0];
                    console.log(listLists);
                    // Iterating through each list
                    let nameCheck = 0;

                    for (let itr = 0; itr < listLists.length; itr++) {
                        // console.log(listLists[itr]);
                        // Iterating through lists made of key, value pairs
                        for (let inneritr = 0; inneritr < Object.entries(listLists[itr]).length; inneritr++) {
                            // Checking name of ListResponse
                            if (Object.entries(listLists[itr])[inneritr][0] === 'name') {
                                if (Object.entries(listLists[itr])[inneritr][1] === 'LifxToken') {
                                    console.log(Object.entries(listLists[itr])[inneritr]);
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
                                    lifxListId = Object.entries(listLists[itr])[inneritr][1];
                                    console.log('Lifx list id is' + lifxListId);
                                    console.log("made it this far");
                                }
                            }
                        }
                    }
                    console.log(lifxListId);
                })
                .catch(error => {
                    console.log(error);
                });
            // Getting list to get token
            let listDest = 'https://api.amazonalexa.com/v2/householdlists/' + lifxListId + '/active';
            await axios.get(listDest, options)
                .then(response => {
                    handlerInput.responseBuilder
                    console.log(response['data']);
                    let listLists = Object.values(response['data']);
                    console.log(listLists[0])
                    for (let itr = 0; itr < listLists[0].length; itr++) {
                        console.log('inside outer loop');
                        // Checking name of ListResponse
                        console.log(Object.entries(listLists[0][itr]));
                        for (let inneritr = 0; inneritr < Object.entries(listLists[0][itr]).length; inneritr++) {
                            console.log('inside inner loop');
                            if (Object.entries(listLists[0][itr])[inneritr][0] === 'value') {
                                console.log(Object.entries(listLists[0][itr])[inneritr]);
                                LifxToken = Object.entries(listLists[0][itr])[inneritr][1];
                            }
                        }
                    }
                });
            /*
                    const lifxAttr = {
                        "LifxToken": LifxToken
                    };
                    // setting peristent attributes
                    attributesManager.setPersistentAttributes(lifxAttr);
                    await attributesManager.savePersistentAttributes()
            */
            console.log('permissions sent');
            handlerInput.responseBuilder
                .speak('Welcome to lumi cue! You can say set timer')
                .reprompt('You can say set laundry timer');
        }
        return handlerInput.responseBuilder
            .getResponse();
    }
};

const ConnectionsResponsetHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response';
    },
    handle(handlerInput) {
        const {
            permissions
        } = handlerInput.requestEnvelope.context.System.user;
        console.log('WE ARE IN CONNECT INTENT' + JSON.stringify(handlerInput.requestEnvelope));
        console.log(JSON.stringify(handlerInput.requestEnvelope));
        console.log('request is ' + JSON.stringify(handlerInput.requestEnvelope.request));
        console.log(handlerInput.requestEnvelope.request.payload.status);
        const status = handlerInput.requestEnvelope.request.payload.status;
        if (!permissions) {
            return handlerInput.responseBuilder
                .speak("I didn't hear your answer. This skill requires your permission.")
                .addDirective({
                    type: 'Connections.SendRequest',
                    name: 'AskFor',
                    payload: {
                        '@type': 'AskForPermissionsConsentRequest',
                        '@version': '1',
                        permissionScope: ['read::alexa:household:list', 'alexa::alerts:timers:skill:readwrite']
                    },
                    token: 'user-id-could-go-here'
                })
                .getResponse();
        }
        switch (status) {
            case 'ACCEPTED':
                handlerInput.responseBuilder
                    .speak('Now that we have permission to set a timer. You can say set a timer.')
                    .reprompt('would you like to start a timer?');
                break;
            case 'DENIED':
                handlerInput.responseBuilder
                    .speak("Without permissions, I can't set a timer. So I guess that's goodbye.");
                break;
            case 'NOT_ANSWERED':
                break;
            default:
                handlerInput.responseBuilder
                    .speak('Now that we have permission to set a timer. You can say set a timer.')
                    .reprompt('would you like to start?');
        }
        return handlerInput.responseBuilder
            .getResponse();
    }
};

const TimerStartIntentHandler = {
    async canHandle(handlerInput) {
        console.log('WE ARE IN START INTENT BEFORE ASYNC' + JSON.stringify(handlerInput.requestEnvelope));
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'TimerStartIntent';
    },
    async handle(handlerInput) {
        console.log('WE ARE IN START INTENT' + JSON.stringify(handlerInput.requestEnvelope));

        // placing corresponding slots to timerItem object
        timerItem.timerLabel = handlerInput.requestEnvelope.request.intent.slots.name.value;
        timerItem.duration = handlerInput.requestEnvelope.request.intent.slots.timeObject.value;

        const duration = moment.duration(timerItem.duration);
        const hours = (duration.hours() > 0) ? `${duration.hours()} ${(duration.hours() === 1) ? 'hour' : 'hours'},` : '';
        const minutes = (duration.minutes() > 0) ? `${duration.minutes()} ${(duration.minutes() === 1) ? 'minute' : 'minutes'} ` : '';
        const seconds = (duration.seconds() > 0) ? `${duration.seconds()} ${(duration.seconds() === 1) ? 'second' : 'seconds'}` : '';

        console.log(seconds);
        // converts duration to miliseconds

        // we need to check if hours, minutes, seconds exists first
        // const lightDuration = moment.duration(timerItem.duration);
        let lightMinutes = 0;
        if (duration.minutes() > 0) {
            lightMinutes = duration.minutes() * 60;
        }
        let lightHours = 0;
        if (duration.hours() > 0) {
            lightHours = duration.hours() * 3600;
        }
        // const lightHours = (duration.hours() > 0) ? duration.hours * 3600 : 0;
        // const lightMinutes = (duration.minutes() > 0) ? duration.hours * 60 : 0;
        const lightSeconds = duration.seconds();

        // logs to check time computed correctly
        console.log(`hours is ${lightHours} and is type ${typeof (lightHours)}`);
        console.log(`minutes is ${lightMinutes} and is type ${typeof (lightMinutes)}`);
        console.log(`seconds is ${lightSeconds} and is type ${typeof (lightSeconds)}`);

        // convert units to miliseconds
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
        // waits length of duration and then calls toggle api
        const optionsLifx = {
            headers: {
                Authorization: `Bearer ${LifxToken.toLowerCase()}`,
                'Content-Type': 'application/json'
            }
        };
        console.log(LifxToken);
        console.log(JSON.stringify(lifxItem));
        axios.post('https://api.lifx.com/v1/lights/all/effects/breathe', lifxItem, optionsLifx)
            .then(response => {
                console.log(response);
            })
            .catch(error => {
                console.log('Error is ' + JSON.stringify(error));
            });
        console.log('Api request sent');
        console.log('This is after set timeout');
        return handlerInput.responseBuilder
            .getResponse();
    }
};

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

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};
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

const LoadLifxTokenInterceptor = {
    async process(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};

        const TokenBucket = sessionAttributes.hasOwnProperty('LifxToken')
        console.log('Before TokenBucket check');
        console.log(TokenBucket);
        if (TokenBucket) {
            attributesManager.setSessionAttributes(sessionAttributes);
            console.log(TokenBucket);
        }
    }
};

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

exports.handler = Alexa.SkillBuilders.custom()
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({
            bucketName: process.env.S3_PERSISTENCE_BUCKET
        })
    )
    .addRequestHandlers(
        LaunchRequestHandler,
        ConnectionsResponsetHandler,
        TimerStartIntentHandler,
        /*    YesNoIntentHandler, */
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addRequestInterceptors(
        LoadLifxTokenInterceptor
    )
    .addErrorHandlers(
        ErrorHandler
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();