const Alexa = require('ask-sdk-core');
const axios = require('axios');
const moment = require('moment');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

// LIFX TOKENS
//const lumiToken = 'cb98795431b49e680bbce1517d29527e46c1513563e1f6fadb375066f4b4b1e3';
const CarlosToken = 'c05cb462e605d284dd8c4a706d63e677b8e31c5f464a84d797b3ec67d048f15b';
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
      textToAnnounce: [
        {
          locale: 'en-US',
          text: 'This ends your timer.'
        }
      ]
    },
    notificationConfig: {
      playAudible: true
    }
  }
};
const lifxItem = {
    "color": "blue",
    "from_color": "purple",
    "period": 5,
    "cycles": 3,
    "persist": false,
    "power_on": true,
    "peak": 1
};

const LaunchRequestHandler = {
  canHandle (handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
    /* || (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest') */;
  },
  handle (handlerInput) {
    console.log('WE ARE IN LAUNCH INTENT' + JSON.stringify(handlerInput.requestEnvelope));
    const { permissions } = handlerInput.requestEnvelope.context.System.user;
    if (!permissions) {
      handlerInput.responseBuilder
        .speak('This skill needs permission to access your timers.')
        .addDirective({
          type: 'Connections.SendRequest',
          name: 'AskFor',
          payload: {
            '@type': 'AskForPermissionsConsentRequest',
            '@version': '1',
            permissionScope: 'alexa::alerts:timers:skill:readwrite'
          },
          token: ''
        });
    } else {
      handlerInput.responseBuilder
        .speak('Welcome to lumi cue! You can say set timer')
        .reprompt('you can say set laundry timer');
    }
    return handlerInput.responseBuilder
      .getResponse();
  }
};

const ConnectionsResponsetHandler = {
  canHandle (handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response';
  },
  handle (handlerInput) {
    const { permissions } = handlerInput.requestEnvelope.context.System.user;
    console.log('WE ARE IN CONNECT INTENT' + JSON.stringify(handlerInput.requestEnvelope));
    console.log(JSON.stringify(handlerInput.requestEnvelope));
    // console.log(handlerInput.requestEnvelope.request.payload.status);
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
            permissionScope: 'alexa::alerts:timers:skill:readwrite'
          },
          token: 'user-id-could-go-here'
        })
        .getResponse();
    }
    switch (status) {
      case 'ACCEPTED':
        handlerInput.responseBuilder
          .speak('Now that we have permission to set a timer. Would you like to start a timer?')
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
          .speak('Now that we have permission to set a timer. Would you like to start?')
          .reprompt('would you like to start?');
    }
    return handlerInput.responseBuilder
      .getResponse();
  }
};

const TimerStartIntentHandler = {
  async canHandle (handlerInput) {
    console.log('WE ARE IN START INTENT BEFORE ASYNC' + JSON.stringify(handlerInput.requestEnvelope));
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
    handlerInput.requestEnvelope.request.intent.name === 'TimerStartIntent';
  },
  async handle (handlerInput) {
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
    const lightHours = (duration.hours() > 0) ? duration.hours * 3600 : 0;
    const lightMinutes = (duration.minutes() > 0) ? duration.hours * 60 : 0;
    const lightSeconds = duration.seconds();

    // logs to check time computed correctly
    console.log(`hours is ${lightHours} and is type ${typeof (lightHours)}`);
    console.log(`minutes is ${lightMinutes} and is type ${typeof (lightMinutes)}`);
    console.log(`seconds is ${lightSeconds} and is type ${typeof (lightSeconds)}`);

    // convert units to miliseconds
    const lightWaitTime = (lightHours + lightMinutes + lightSeconds) / 5;
    lifxItem['cycles'] = lightWaitTime;
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
    /*
    const optionsLifx = {
        headers: {
        Authorization: `Bearer ${lumiToken}`
        }
    };
    axios.post('https://api.lifx.com/v1/lights/all/toggle', lifxItem, optionsLifx)
        .catch(error => {
        console.log(error);
    }); */

    console.log('This is before set Timeout');
    // const callLambda = function callApiLambda() {
    console.log('Calling API lambda');
    // Calls lambda that calls Lifx API. Now passes nothing, but should eventually pass duration and token
    const optionsLifx = {
      headers: {
        Authorization: `Bearer ${CarlosToken}`,
        'Content-Type': 'application/json'
      }
    };
    console.log(JSON.stringify(lifxItem));
    axios.post('https://api.lifx.com/v1/lights/all/effects/breathe', lifxItem, optionsLifx)
      .then(response => {
        console.log('API request sent');
      })
      .catch(error => {
        console.log('Error is ' + JSON.stringify(error));
      });
    console.log('Api request sent');
    //  }

    /* await setTimeout(function lightUp () {
      let x = 0;
      const intervalID = setInterval(function () {
        // References Lifx API 4 times with one second intervals between calls
        const optionsLifx = {
          headers: {
            Authorization: `Bearer ${lumiToken}`
          }
        };
        console.log(optionsLifx);
        axios.post('https://api.lifx.com/v1/lights/all/toggle', lifxItem, optionsLifx)
          .catch(error => {
            console.log(error);
          });
        if (++x === 4) {
          clearInterval(intervalID);
        }
      }, 1000);
    }, 10000); */

    console.log('This is after set timeout');
    return handlerInput.responseBuilder
      .getResponse();
  }
};
/*
const TimerStartIntentHandler = {
  async canHandle (handlerInput) {
    console.log('WE ARE IN START INTENT BEFORE ASYNC' + JSON.stringify(handlerInput.requestEnvelope));
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'TimerStartIntent';
  },
  async handle (handlerInput) {
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
    const lightDuration = moment.duration(timerItem.duration);
    const lightHours = (duration.hours() > 0) ? duration.hours * 3600 : 0;
    const lightMinutes = (duration.minutes() > 0) ? duration.hours * 60 : 0;
    const lightSeconds = duration.seconds();

    // logs to check time computed correctly
    console.log(`hours is ${lightHours} and is type ${typeof (lightHours)}`);
    console.log(`minutes is ${lightMinutes} and is type ${typeof (lightMinutes)}`);
    console.log(`seconds is ${lightSeconds} and is type ${typeof (lightSeconds)}`);

    // convert units to miliseconds
    const lightWaitTime = (lightHours + lightMinutes + lightSeconds) * 1000;
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
    /*
    const optionsLifx = {
        headers: {
        Authorization: `Bearer ${lumiToken}`
        }
    };
    axios.post('https://api.lifx.com/v1/lights/all/toggle', lifxItem, optionsLifx)
        .catch(error => {
        console.log(error);
    });

    console.log('This is before set Timeout');

    await setTimeout(function lightUp () {
      let x = 0;
      const intervalID = setInterval(function () {
        // References Lifx API 4 times with one second intervals between calls
        const optionsLifx = {
          headers: {
            Authorization: `Bearer ${lumiToken}`
          }
        };
        console.log(optionsLifx);
        axios.post('https://api.lifx.com/v1/lights/all/toggle', lifxItem, optionsLifx)
          .catch(error => {
            console.log(error);
          });
        if (++x === 4) {
          clearInterval(intervalID);
        }
      }, 1000);
   }, lightWaitTime);

    /*setTimeout(function lightUp () {
        intervalID;
        console.log("we came in here")
    }, lightWaitTime); */
/*
    const optionsLifx = {
        headers: {
        Authorization: `Bearer ${lumiToken}`
        }
    }

    let x = 0;
    const intervalID = function lifxRequest () {
        console.log(optionsLifx);
        axios.post('https://api.lifx.com/v1/lights/all/toggle', lifxItem, optionsLifx)
            .catch(error => {
            console.log(error);
            });
        if (++x === 4) {
            clearInterval(intervalID);
            console.log("we cleared the interval")
        }
   }

    console.log('This is after set timeout');
    return handlerInput.responseBuilder
      .getResponse();
  }
};
*/
/*
const YesNoIntentHandler = {
  canHandle (handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
  },
  async handle (handlerInput) {
    // handle 'yes' utterance
    console.log('WE ARE IN YES INTENT' + JSON.stringify(handlerInput.requestEnvelope));
    if (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent') {
      // timerItem['name'] = handlerInput.requestEnvelope.request.intent.slots.timerName.value;
      timerItem.timerLabel = 'IDK';
      const duration = moment.duration(timerItem.duration);
      const hours = (duration.hours() > 0) ? `${duration.hours()} ${(duration.hours() === 1) ? 'hour' : 'hours'},` : '';
      const minutes = (duration.minutes() > 0) ? `${duration.minutes()} ${(duration.minutes() === 1) ? 'minute' : 'minutes'} ` : '';
      const seconds = (duration.seconds() > 0) ? `${duration.seconds()} ${(duration.seconds() === 1) ? 'second' : 'seconds'}` : '';
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
      if (handlerInput.requestEnvelope.request.error !== null) {
        console.log(JSON.stringify(handlerInput.requestEnvelope.request.error));
      }
    }
    // handle 'no' utterance
    if (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') {
      handlerInput.responseBuilder
        .speak('Alright I didn\'t start a timer.');
    }
    return handlerInput.responseBuilder
      .getResponse();
  }
};
*/
const HelpIntentHandler = {
  canHandle (handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle (handlerInput) {
    const speakOutput = 'You can say set a timer';
    const speakReprompt = 'You can say set oven timer';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakReprompt)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle (handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle (handlerInput) {
    const speakOutput = 'Have a Luminous Day!';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle (handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle (handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  }
};
const IntentReflectorHandler = {
  canHandle (handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle (handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;
    return handlerInput.responseBuilder
      .speak(speakOutput)
    // .reprompt('add a reprompt if you want to keep the session open for the user to respond')
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle () {
    return true;
  },
  handle (handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);
    console.log(`handlerInput.requestEnvelope: ${handlerInput.requestEnvelope}`);
    const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

function getApiEndpoint (locale) {
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
    case 'pt-BR' :
      apiEndpoint = naEndpoint;
      break;
  }
  return apiEndpoint;
}

exports.handler = Alexa.SkillBuilders.custom()
  .withPersistenceAdapter(
    new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
  )
  .addRequestHandlers(
    LaunchRequestHandler,
    ConnectionsResponsetHandler,
    TimerStartIntentHandler,
/*    YesNoIntentHandler,*/
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
