![Lumi Cue logo](images/lumi_cue_wide_header.png)
# Lumi Cue
- [Lumi Cue](#lumi-cue)
  - [Download](#download)
  - [Using Lumi Cue for the first time](#using-lumi-cue-for-the-first-time)
    - [Creating a Lifx Token](#creating-a-lifx-token)
    - [Granting permissions](#granting-permissions)
  - [Authors](#authors)
  - [Acknowledgements](#acknowledgements)

Lumi Cue is an Alexa skill that combines visual and auditory cues for timers. Ask Alexa to tell Lumi Cue to set a timer. While it runs, your Lifx lights will create a soothing ambiance. At the end of your timer, the lights will revert back to your original settings.
## Download
## Using Lumi Cue for the first time
Before using Lumi Cue for the first time, you will need to set up your personal Lifx token.

### Creating a Lifx Token
If you have a Lifx account already set up, follow [this link](https://cloud.lifx.com/settings) to the Lifx Cloud to generate a unique user token. Lumi Cue will use this token in order to toggle your personal Lifx lights.

Once you have created your personal Lifx token, open the Alexa app on your phone, and do the following:
1. Navigate to the icon on the bottom right of the screen labeled "More."
2. Select "Lists and Notes."
3. Create a new list named **EXACTLY** "LifxToken"
4. Paste your personal Lifx token as the only item in the list.


<img src="images/screenshots/creating_list.png" alt="Screenshot of More page on Alexa app" width="300px"/>   <img src="images/screenshots/lifxtoken_list_view.png" alt="Screenshot of LifxToken list on Alexa app" width="300px"/>


| ⚠️ NOTE: Lumi Cue will use this list each time you call the skill in order to access your personal token. **Do not delete this list after your first use.** |
| --- |

### Granting permissions
To open Lumi Cue for the first time, tell Alexa "Open Lumi Cue."
She will respond by saying that Lumi Cue needs permission to access your timers and lists. To grant Lumi Cue permissions, open your Alexa app on your phone and click the card to grant permissions to Lumi Cue.

<img src="images/screenshots/permission_request.png" alt="Screenshot of permissions request" width="300px"/>


## Authors
* **Aleia DeVore**

  * :robot: [GitHub](https://github.com/aleiadevore)

  * :briefcase: [LinkedIn](https://www.linkedin.com/in/aleiamcnaney/)

* **Carlos Esquivel**

  * :robot: [GitHub](https://github.com/CSant04y)

  * :briefcase: [LinkedIn](https://www.linkedin.com/in/carlos-esquivel-515768186/)
## Acknowledgements
* [Dabble Lab Alexa Timer Skill](https://github.com/dabblelab/19-alexa-timers-example-skill)

* [Sample Random Fact Skill](https://www.c-sharpcorner.com/article/creating-food-fact-skill-using-fact-skill-template/)
