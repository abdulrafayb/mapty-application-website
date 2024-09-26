"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

// here we implement the class to manage the data about running and cycling workouts that is coming from the user interface
class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10); // we should never creates ids ourselves but it should always be done with a library
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance; // min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //km/h
    return this.speed;
  }
}

/* const r1 = new Running([39, -12], 5.2, 24, 178);
const c1 = new Cycling([39, -12], 27, 85, 539);
console.log(r1, c1); */

/* about functionality that we are gonna implement is rendering workout form whenever user clicks on the map so that new workout can be added and on that form we'll add an event handler so that whenever the form is submitted only then the marker is rendered on the map showing the new workout */

class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workouts = [];

  // this method gets executed as soon as the new app down below is created meaning when a new object is created from this class
  constructor() {
    this.#getPosition();
    this.#getLocalStorage(); // getting data from local storage
    form.addEventListener("submit", this.#newWorkout.bind(this)); // this will point to form so we use bind
    inputType.addEventListener("change", this.#toggleFields); // this keyword isn't used in this so we don't have to use bind

    /* a situation in which we don't have the element on which we want to attach the event listener because it hasn't been created yet, so the solution to that is event delegation meaning we are gonna add the event listener to a parent element which is 'workouts' in HTML file */
    containerWorkouts.addEventListener("click", this.#moveToPopup.bind(this));
  }

  /* geolocation API is an browser API just like internationalization or timers that the browser gives us, and this function takes two callback function, the first one is called on when we successfully get the coordinates from the browser and the second one is called when we get an error while getting the coordinates, and also we are gonna display the map using a third party library called leaflet */
  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this), // regular function call
        function () {
          alert("Could not get your position");
        }
      );
  }

  #loadMap(position) {
    // console.log(position); // takes in a parameter for position

    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude]; // as setview expects an array of coordinates

    /* whatever string that we pass here into this map function must be the ID name of an element in our HTML because it is in that element where the map will be displayed, and L here is the main function that leaflet gives us as an entry point, it is kind of like an namespace and then it has a couple of methods that we can use, and it comes from the leaflet script */
    // console.log(this); // this here returns undefined because the coordinates comes from a regular function call so we use bind
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    /* we need to attach an event handler on the map so that we can then handle any incoming clicks, we can attach it directly to the map object, and leaflet will provide us with the coordinates of the click event */
    this.#map.on("click", this.#showForm.bind(this));

    this.#workouts.forEach((work) => {
      this.#renderWorkoutMarker(work);
    });
  }

  #showForm(mapE) {
    // console.log(this.#mapEvent);
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus(); // shifting focus to this input field
  }

  #hideForm() {
    // empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  #toggleFields() {
    /* when the 'type' input field changes, we want to toggle the visibility of the 'elevation' and 'cadence' input fields, since only one of them should be visible at a time, we'll add or remove the 'hidden' class from their parent elements to show or hide them, we use the closest() method to find the closest parent element (in this case, a div with the class form__row) that contains the 'elevation' and 'cadence' input fields, and then toggle the 'hidden' class on those parent elements */
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  #newWorkout(e) {
    // creating helper function for testing complex conditions
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositives = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout running then create running that object
    if (type === "running") {
      const cadence = +inputCadence.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      ) {
        // !Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)
        return alert("Inputs have to be positive numbers!");
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycling then create cycling that object
    if (type === "cycling") {
      const elevationGain = +inputElevation.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, elevationGain) ||
        !allPositives(distance, duration)
      ) {
        return alert("Inputs have to be positive numbers!");
      }
      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    // add the new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    // render workout on map as marker
    this.#renderWorkoutMarker(workout);

    // render workout on list
    this.#renderWorkout(workout);

    // hide form and clear input fields
    this.#hideForm();

    /* we are gonna set up the local storage API to store the workouts in the browser's local storage and it will stay there even after we close the page, the data is linekd to the URL on which the application is running, we'll take the workouts array and store it in the local storage and then whenever the page loads then it will also load all the workouts from the local storage and render them on the map and the list */
    this.#setLocalStorage();
  }

  #renderWorkoutMarker(workout) {
    /* marker() creates the marker, addto() adds the marker on the map, bindpopup() creates a popup then binds it to the marker but here instead of simply passing the string we can also create a new popup object which will contain couple of options */
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type == "running") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type == "cycling") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

      /* we can't inject this in the parent element 'ul' because the first child is the form and only the second element should become the first activity, therefore we can't attach the new workout element to the parent element because we could either insert it as a first or last child but we don't want any of those options, instead we'll insert it close to this form but basically insert it as a sibling element */
    }

    form.insertAdjacentHTML("afterend", html); // afterend adds it at the end of the form as sibling element
  }

  #moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    // console.log(workoutEl); // we are gonna use the unique id of our objects to find the workout in the workouts array

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    /* the problem is when we convert our objects to a string and then back from the string to objects we lose the prototype chain so the new objects that we recover from the local storage become regular objects, they are no longer the objects that were created by our classes therefore they will not inherit any of their methods and that's the reason why workout.click is not a function anymore because the object now no longer has that method in its prototype, and this can be big problem when we work with local storage and OOP, now to fix this problem we can restore the objects so in our getlocalstorage method we can loop over the data and then restore the objects by creating a new object using the class based on the data that is coming from local storage */
    // workout.click(); // saving clicks that we get from public interface
  }

  #setLocalStorage() {
    /* here first argument is the name (key) and the second one needs to be string that we want to store and which will be associated with the key, local storage is a simple (key-value) store, this API is only advised to be used for small amounts of data as it is a simple API and because it is blocking and will slow down the application */
    localStorage.setItem("workouts", JSON.stringify(this.#workouts)); // converting the object to a string
  }

  #getLocalStorage() {
    /* we simply have to pass in the key basically the identifier of the our local storage item because we could set multiple items, we can also store everything that's in the application in the local storage we'll have to define one key for each of them and then we can use that key to retrieve the data back */
    const data = JSON.parse(localStorage.getItem("workouts")); // convert string to object
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this.#renderWorkout(work);
      /* this will not work because this method is executed righr at the beginning or right after the page reloads and then we try to add this marker to the map right at the beginning however at this point the map has actually not yet been loaded so it takes some time to load, and we've also set it to load after we get the coordinates, so we'll render the markers once the map loads*/
      // this.#renderWorkoutMarker(work);
    });
  }

  /* quick and easy way to delete all of these workouts from the local storage which we'll use in the console by reloading the page programmatically using location.reload as its one of its ability and the application will look completely empty, and where we'll use it as we are creating the app object and then storing it in app so we use it on app as 'app.reset()' */
  reset() {
    localStorage.removeItem("workouts");
    location.reload(); // location is a big object that contains alot of methods and properties in the browser
  }
}

const app = new App();
// app.#getPosition(); // and that's why we call it in the constructor function

/* every library comes with a documentation so that we can know how to use it, and reading documentation is something really important for our job as a developer */
