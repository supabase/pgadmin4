import _ from 'lodash';
import React from 'react';

export const DepListenerContext = React.createContext();

export default class DepListener {
  constructor() {
    this._depListeners = [];
  }

  /* Will keep track of the dependent fields and there callbacks */
  addDepListener(source, dest, callback, defCallback) {
    this._depListeners = this._depListeners || [];
    this._depListeners.push({
      source: source,
      dest: dest,
      callback: callback,
      defCallback: defCallback
    });
  }

  _getListenerData(state, listener, actionObj) {
    /* Get data at same level */
    let data = state;
    let dataPath = _.slice(listener.dest, 0, -1);
    if(dataPath.length > 0) {
      data = _.get(state, dataPath);
    }
    data = _.assign(data, listener.callback && listener.callback(data, listener.source, state, actionObj) || {});
    return state;
  }

  _getDefListenerPromise(state, listener, actionObj) {
    /* Get data at same level */
    let data = state;
    let dataPath = _.slice(listener.dest, 0, -1);
    if(dataPath.length > 0) {
      data = _.get(state, dataPath);
    }
    return (listener.defCallback && listener.defCallback(data, listener.source, state, actionObj));
  }

  /* Called when any field changed and trigger callbacks */
  getDepChange(currPath, state, actionObj) {
    if(actionObj.depChangeResolved) {
      state = this._getListenerData(state, {callback: actionObj.depChangeResolved}, actionObj);
    } else {
      let allListeners = _.filter(this._depListeners, (entry)=>_.join(currPath, '|').startsWith(_.join(entry.source, '|')));
      if(allListeners) {
        for(const listener of allListeners) {
          state = this._getListenerData(state, listener, actionObj);
        }
      }
    }
    return state;
  }

  getDeferredDepChange(currPath, state, actionObj) {
    let deferredList = [];
    let allListeners = _.filter(this._depListeners, (entry)=>_.join(currPath, '|').startsWith(_.join(entry.source, '|')));
    if(allListeners) {
      for(const listener of allListeners) {
        if(listener.defCallback) {
          let thePromise = this._getDefListenerPromise(state, listener, actionObj);
          if(thePromise) {
            deferredList.push({
              action: actionObj,
              promise: thePromise,
            });
          }
        }

      }
    }
    return deferredList;
  }
}
