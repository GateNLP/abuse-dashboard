import React, { Suspense } from 'react';
//import ReactDOM from 'react-dom';

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { logger } from 'redux-logger';
import createSagaMiddleware from 'redux-saga';

import rootSaga from "./redux/sagas";
import allReducers from "./redux/reducers";

import './i18n';

const sagaMiddleware = createSagaMiddleware();

export const store = createStore(
  allReducers,
  applyMiddleware(sagaMiddleware, logger)
);

sagaMiddleware.run(rootSaga);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Suspense fallback={<div/>}>
  <Provider store={store}>
    <App />
  </Provider>
</Suspense>);



// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

//  <React.StrictMode>