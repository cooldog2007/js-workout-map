'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map, mapEvent;

class App {
  #map;
  #mapZlevel = 16;
  #mapE;
  #workouts = [];
  constructor() {
    this._getPosition();

    //get data from local storage

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener(
      'click',
      this._setViewOnWorkout.bind(this)
    );
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("shan't");
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    // const gmapsUrl = `https://www.google.com/maps/@${latitude},${longitude},17z`;

    this.#map = L.map('map').setView(coords, this.#mapZlevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this._getLocalStorage();
  }

  _showForm(mapEvent) {
    this.#mapE = mapEvent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _newWorkout(e) {
    e.preventDefault();
    const { lat, lng } = this.#mapE.latlng;
    const coords = [lat, lng];

    //verifying input data

    let valid = true;
    const validate = function (...inputEls) {
      [...inputEls].forEach(function (el) {
        if (el === inputElevation && Number.isFinite(+el.value)) return;
        if (!Number.isFinite(+el.value) || +el.value <= 0) valid = false;
      });
    };

    if (inputType.value === 'cycling') {
      validate(inputDistance, inputDuration, inputElevation);
    }

    if (inputType.value === 'running') {
      validate(inputDistance, inputDuration, inputCadence);
    }

    if (valid === false)
      return alert('ПОЛОЖИТЕЛЬНЫЕ ЧСЛА НИГГЕР (КРОМЕ ЭЛЕВАЦИИ)');

    //creating new workout object

    let workout;
    if (inputType.value === 'cycling') {
      workout = new Cycling(
        inputDistance.value,
        inputDuration.value,
        coords,

        inputElevation.value
      );
    } else {
      workout = new Running(
        inputDistance.value,
        inputDuration.value,
        coords,

        inputCadence.value
      );
    }
    this.#workouts.push(workout);

    this._hideForm();
    //rendering workout list

    this._renderWorkout(workout);
    //rendering marker
    this._renderMarker(workout);

    //set local storage to all workouts
    this._setLocalSorage();
  }

  _setLocalSorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(wk => {
      this._renderWorkout(wk);
      this._renderMarker(wk);
    });
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 600);
  }

  _renderWorkout(workout) {
    form.classList.add('hidden');
    form.insertAdjacentHTML(
      'afterend',
      ` <li class="workout workout--${workout.type}" data-id="${workout.id}">
<h2 class="workout__title">${workout.description}</h2>
<div class="workout__details">
  <span class="workout__icon">${workout.type === 'cycling' ? '🚴‍♀️' : '🏃'}</span>
  <span class="workout__value">${workout.distance}</span>
  <span class="workout__unit">km</span>
</div>
<div class="workout__details">
  <span class="workout__icon">⏱</span>
  <span class="workout__value">${workout.duration}</span>
  <span class="workout__unit">min</span>
</div>
<div class="workout__details">
  <span class="workout__icon">⚡️</span>
  <span class="workout__value">${workout.pace ?? workout.speed}</span>
  <span class="workout__unit">${workout.pace ? 'min/km' : 'km/h'}</span>
</div>
<div class="workout__details">
  <span class="workout__icon">${workout.type === 'cycling' ? '⛰' : '🦶🏼'}</span>
  <span class="workout__value">${
    workout.cadence ?? workout.elevationGain
  }</span>
  <span class="workout__unit">${workout.cadence ? 'spm' : 'm'}</span>
</div>
</li>`
    );
  }

  _renderMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
          maxWidth: 250,
          minWidth: 100,
        }).setContent(
          `${workout.type === 'cycling' ? '🚴‍♀️' : '🏃'} ${workout.description}`
        )
      )
      .openPopup();
  }

  _setViewOnWorkout(e) {
    if (!e.target.closest('.workout')?.dataset?.id) return;

    const targetId = e.target.closest('.workout').dataset.id;
    const workout = this.#workouts.find(wk => wk.id === targetId);
    this.#map.setView(workout.coords, this.#mapZlevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // workout.glick();
  }

  _toggleElevationField() {
    [
      inputCadence.closest('.form__row'),
      inputElevation.closest('.form__row'),
    ].forEach(row => row.classList.toggle('form__row--hidden'));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  glicks = 0;
  constructor(distance, duration, coords) {
    this.distance = Number(distance);
    this.duration = Number(duration);
    this.coords = coords;

    this.dateFormat = new Intl.DateTimeFormat(navigator.language, {
      month: 'long',
      day: '2-digit',
    }).format(this.date);
  }
  _setDescription() {
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      this.dateFormat
    }`;
  }

  glick() {
    this.glicks++;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevGain) {
    super(distance, duration, coords);
    this.elevationGain = Number(elevGain);
    this.speed = (distance / (duration / 60)).toFixed(1);
    this._setDescription();
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = Number(cadence);
    this.pace = (duration / distance).toFixed(1);
    this._setDescription();
  }
}
const app = new App();
const cyc = new Cycling(1, 30, [53.23, 27.53], 4);
// console.log(cyc._setDescription());
