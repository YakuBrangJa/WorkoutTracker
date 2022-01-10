'use strict';

// let map, mapEvent;
// let marker = {};

class Workout {
  date = new Date();
  id = Date.now().toString().slice(-10);

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
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    // this.type = 'running';
    // this.pace = this.duration / this.distance;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

// APPLICATION ARCHETECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const formCloseBtn = document.querySelector('.form__close-btn');

class App {
  #map;
  #mapEvent;
  #marker = {};
  #workouts = [];

  constructor() {
    this._getPosition();

    // fetching data from locak storage
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    containerWorkouts.addEventListener('click', this._delete.bind(this));

    containerWorkouts.addEventListener('click', this._edit.bind(this));

    formCloseBtn.addEventListener('click', this._closeForm);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const coords = [latitude, longitude];
      this.#map = L.map('map').setView(coords, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);

      this.#map.on('click', this._showForm.bind(this));

      this.#workouts.forEach(work => {
        // this._renderWorkout(work);
        this._renderWorkoutMarker(work);
      });
    }
  }

  _showForm(mapE) {
    if (this.#marker != undefined) this.#map.removeLayer(this.#marker);

    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();

    const { lat, lng } = this.#mapEvent.latlng;
    this.#marker = L.marker([lat, lng], {
      draggable: true,
      opacity: 0.6,
    }).addTo(this.#map);
    this.#map.addLayer(this.#marker);
  }

  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 600);
  }

  _closeForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = function (...inputs) {
      return inputs.every(inp => Number.isFinite(inp));
    };
    const allPositive = function (...inputs) {
      return inputs.every(inp => inp > 0);
    };

    // const validInputs = (...inputs) =>
    //   inputs.every(inp => Number.isFinite(inp));
    // const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value; // + sign convert string to number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive number');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive number');
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // hidding form
    // form.classList.add('hidden');
    this.#workouts.push(workout);

    // Displaying marker
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);

    // Clearing input fields
    this._hideForm();

    // Storing data in Local Storage
    this._setLocalStorage(this.#workouts);
  }

  _renderWorkoutMarker(e) {
    L.marker(e.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 60,
          autoClose: false,
          closeOnClick: false,
          className: `${e.type}-popup`,
        })
      )
      .setPopupContent(`${e.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${e.description}`)
      .openPopup();
  }

  _renderWorkout(e) {
    let html = ` 
    <li class="workout workout--${e.type}" data-id="${e.id}">
    ${this._workoutHtml(e)} </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  _workoutHtml(a) {
    if (a.type === 'running') {
      return `
      <div class="workout__title">
      <h2 >${a.description}</h2>
      <div class="editor">
        <button class="edit">
        <span><img src="icons/edit1.svg"></span>
        </button>
        <button class="delete">
        <span><img src="icons/trash1.svg"></span>
        </button>
      </div>
      </div>
      <div class="workout__details">
        <span class="workout__icon">${
          a.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        } </span>
        <span class="workout__value">${a.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${a.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${a.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${a.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      `;
    }
    if (a.type === 'cycling') {
      return `
      <div class="workout__title">
      <h2 >${a.description}</h2>
      <div class="editor">
        <button class="edit">
        <span><img src="icons/edit1.svg"></span>
        </button>
        <button class="delete">
        <span><img src="icons/trash1.svg"></span>
        </button>
      </div>
      </div>
      <div class="workout__details">
        <span class="workout__icon">${
          a.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        } </span>
        <span class="workout__value">${a.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${a.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${a.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${a.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      `;
    }
  }

  _moveToPopup(e) {
    if (e.target.closest('.delete') || e.target.closest('.edit')) return;

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    //jump to clicked coordinates on map
    this.#map.setView(workout.coords, 14, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // _setLocalStorage() {
  //   localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  // }
  _setLocalStorage(e) {
    localStorage.setItem('workouts', JSON.stringify(e));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _delete(e) {
    const delBtn = e.target.closest('.delete');
    if (!delBtn) return;

    const delEl = delBtn.parentNode.parentNode.parentNode;

    // unrendering the list
    delEl.classList.add('hide');

    // removing data from LocalStorage
    const delData = this.#workouts.find(work => work.id === delEl.dataset.id);

    this.#workouts.splice(this.#workouts.indexOf(delData), 1);

    this._setLocalStorage(this.#workouts);

    // removing the list from document
    setTimeout(() => delEl.parentNode.removeChild(delEl), 600);
  }

  _edit(e) {
    const editBtn = e.target.closest('.edit');
    if (!editBtn) return;

    const editEl = editBtn.parentNode.parentNode.parentNode;

    let editData = this.#workouts.find(work => work.id === editEl.dataset.id);

    // closing other editor forms
    if (editEl.parentNode.querySelectorAll('form').length > 1) {
      const otherForm = editEl.parentNode.querySelector('.editForm');
      console.log(otherForm.dataset.id);

      const otherData = this.#workouts.find(
        work => work.id === otherForm.dataset.id
      );

      const otherWorkout = document.createElement('li');
      otherWorkout.setAttribute('data-id', `${otherData.id}`);
      otherWorkout.classList.add('workout', `workout--${otherData.type}`);
      otherWorkout.innerHTML = this._workoutHtml(otherData);

      otherForm.parentNode.replaceChild(otherWorkout, otherForm);
    }

    // Replacing clicked item with editor form
    const editForm = document.createElement('form');
    editForm.classList.add('editForm');
    editForm.setAttribute('data-id', `${editData.id}`);

    editForm.innerHTML = `
          <button type="button" class="editForm__close-btn">
            <img src="icons/clear.png" />
          </button>
        <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input editForm__input--type">
              <option value="running" ${
                editData.type === 'running' ? 'selected' : ''
              }>Running</option>
              <option value="cycling" ${
                editData.type === 'cycling' ? 'selected' : ''
              }>Cycling</option>
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input value="${
              editData.distance
            }" class="form__input editForm__input--distance" placeholder="km" />
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              value="${editData.duration}"
              class="form__input editForm__input--duration"
              placeholder="min"
            />
          </div>
          <div class="form__row">
            <label class="form__label">Cadence</label>
            <input
              value="${editData.cadence}"
              class="form__input editForm__input--cadence"
              placeholder="step/min"
            />
          </div>
          <div class="form__row form__row--hidden">
            <label class="form__label">Elev Gain</label>
            <input
              value="${editData.elevationGain}"
              class="form__input editForm__input--elevation"
              placeholder="meters"
            />
          </div>
          <button type="submit" class="form__btn">OK</button>

        `;

    editEl.parentNode.replaceChild(editForm, editEl);

    const form = document.querySelector('.editForm');
    const inputType = document.querySelector('.editForm__input--type');
    const inputDistance = document.querySelector('.editForm__input--distance');
    const inputDuration = document.querySelector('.editForm__input--duration');
    const inputCadence = document.querySelector('.editForm__input--cadence');
    const inputElevation = document.querySelector(
      '.editForm__input--elevation'
    );

    // closing editor form
    document
      .querySelector('.editForm__close-btn')
      .addEventListener('click', function () {
        editForm.parentNode.replaceChild(editEl, editForm);
      });

    if (editData.type === 'cycling') {
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
    }

    editForm.addEventListener('submit', e => {
      const validInputs = function (...inputs) {
        return inputs.every(inp => Number.isFinite(inp));
      };
      const allPositive = function (...inputs) {
        return inputs.every(inp => inp > 0);
      };

      e.preventDefault();

      editData.type = inputType.value;
      editData.distance = +inputDistance.value;
      editData.duration = +inputDuration.value;
      const { lat, lng } = editData.coords;
      let workout;

      if (editData.type === 'running') {
        editData.cadence = +inputCadence.value;

        if (
          !validInputs(
            editData.distance,
            editData.duration,
            editData.cadence
          ) ||
          !allPositive(editData.distance, editData.duration, editData.cadence)
        ) {
          return alert('Inputs have to be positive number');
        }

        workout = new Running([lat, lng], editData.distance, editData.cadence);
      }

      if (editData.type === 'cycling') {
        editData.elevationGain = +inputElevation.value;

        if (
          !validInputs(
            editData.distance,
            editData.duration,
            editData.elevationGain
          ) ||
          !allPositive(editData.distance, editData.duration)
        ) {
          return alert('Inputs have to be positive number');
        }

        workout = new Cycling(
          [lat, lng],
          editData.distance,
          editData.duration,
          editData.elevationGain
        );
      }

      // Updating #workouts data array with edited data
      console.log(editData);

      this.#workouts[
        this.#workouts.indexOf(
          this.#workouts.find(work => work.id === editEl.dataset.id)
        )
      ] = editData;

      console.log(this.#workouts);

      // Updating localStorage Data
      this._setLocalStorage(this.#workouts);

      // replacing editor form with edited workout item
      const editedWorkout = document.createElement('li');
      editedWorkout.setAttribute('data-id', `${editData.id}`);
      editedWorkout.classList.add('workout', `workout--${editData.type}`);
      editedWorkout.innerHTML = this._workoutHtml(editData);

      editForm.parentNode.replaceChild(editedWorkout, editForm);
    });
  }
}

const app = new App();
