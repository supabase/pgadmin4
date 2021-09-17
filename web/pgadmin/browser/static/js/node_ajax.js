/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import getApiInstance from '../../../static/js/api_instance';
import {generate_url} from 'sources/browser/generate_url';
import pgAdmin from 'sources/pgadmin';

/* It generates the URL based on tree node selected */
export function generateNodeUrl(treeNodeInfo, actionType, itemNodeData, withId, jumpAfterNode) {
  let opURL = {
      'create': 'obj',
      'drop': 'obj',
      'edit': 'obj',
      'properties': 'obj',
      'statistics': 'stats',
    },
    priority = -Infinity;
  let nodeObj = this;
  let itemID = withId && itemNodeData._type == nodeObj.type ? encodeURIComponent(itemNodeData._id) : '';
  actionType = actionType in opURL ? opURL[actionType] : actionType;

  if (nodeObj.parent_type) {
    if (_.isString(nodeObj.parent_type)) {
      let p = treeNodeInfo[nodeObj.parent_type];
      if (p) {
        priority = p.priority;
      }
    } else {
      _.each(nodeObj.parent_type, function(o) {
        let p = treeNodeInfo[o];
        if (p) {
          if (priority < p.priority) {
            priority = p.priority;
          }
        }
      });
    }
  }

  let jump_after_priority = priority;
  if(jumpAfterNode && treeNodeInfo[jumpAfterNode]) {
    jump_after_priority = treeNodeInfo[jumpAfterNode].priority;
  }

  var nodePickFunction = function(treeInfoValue) {
    return (treeInfoValue.priority <= jump_after_priority || treeInfoValue.priority == priority);
  };

  return generate_url(pgAdmin.Browser.URL, treeNodeInfo, actionType, nodeObj.type, nodePickFunction, itemID);
}


/* Get the nodes list as options required by select controls
 * The options are cached for performance reasons.
 */
export function getNodeAjaxOptions(url, nodeObj, treeNodeInfo, itemNodeData, params={}, transform=(data)=>data) {
  let otherParams = {
    urlWithId: false,
    jumpAfterNode: null,
    ...params
  };
  return new Promise((resolve, reject)=>{
    const api = getApiInstance();
    let fullUrl = '';
    if(url) {
      fullUrl = generateNodeUrl.call(
        nodeObj, treeNodeInfo, url, itemNodeData, otherParams.urlWithId, nodeObj.parent_type, otherParams.jumpAfterNode
      );
    }

    if (url) {
      let cacheNode = pgAdmin.Browser.Nodes[otherParams.cacheNode] || nodeObj;
      let cacheLevel = otherParams.cacheLevel || cacheNode.cache_level(treeNodeInfo, otherParams.urlWithId);
      /*
      * We needs to check, if we have already cached data for this url.
      * If yes - use that, and do not bother about fetching it again,
      * and use it.
      */
      var data = cacheNode.cache(nodeObj.type + '#' + url, treeNodeInfo, cacheLevel);

      if (_.isUndefined(data) || _.isNull(data)) {
        api.get(fullUrl)
          .then((res)=>{
            data = res.data.data;
            cacheNode.cache(nodeObj.type + '#' + url, treeNodeInfo, cacheLevel, data);
            resolve(transform(data));
          })
          .catch((err)=>{
            reject(err);
          });
      } else {
        // To fetch only options from cache, we do not need time from 'at'
        // attribute but only options.
        resolve(transform(data.data || []));
      }
    }
  });
}

/* Get the nodes list based on current selected node id */
export function getNodeListById(nodeObj, treeNodeInfo, itemNodeData, filter=()=>true) {
  /* Transform the result to add image details */
  const transform = (rows) => {
    var res = [];

    _.each(rows, function(r) {
      if (filter(r)) {
        var l = (_.isFunction(nodeObj['node_label']) ?
            (nodeObj['node_label']).apply(nodeObj, [r]) :
            r.label),
          image = (_.isFunction(nodeObj['node_image']) ?
            (nodeObj['node_image']).apply(nodeObj, [r]) :
            (nodeObj['node_image'] || ('icon-' + nodeObj.type)));

        res.push({
          'value': r._id,
          'image': image,
          'label': l,
        });
      }
    });

    return res;
  };

  return getNodeAjaxOptions('nodes', nodeObj, treeNodeInfo, itemNodeData, null, transform);
}

/* Get the nodes list based on node name passed */
export function getNodeListByName(node, treeNodeInfo, itemNodeData, filter=()=>true, postTransform=(res)=>res) {
  let nodeObj = pgAdmin.Browser.Nodes[node];
  /* Transform the result to add image details */
  const transform = (rows) => {
    var res = [];

    _.each(rows, function(r) {
      if (filter(r)) {
        var l = (_.isFunction(nodeObj['node_label']) ?
            (nodeObj['node_label']).apply(nodeObj, [r]) :
            r.label),
          image = (_.isFunction(nodeObj['node_image']) ?
            (nodeObj['node_image']).apply(nodeObj, [r]) :
            (nodeObj['node_image'] || ('icon-' + nodeObj.type)));

        res.push({
          'value': r.label,
          'image': image,
          'label': l,
        });
      }
    });

    return postTransform(res);
  };

  return getNodeAjaxOptions('nodes', nodeObj, treeNodeInfo, itemNodeData, null, transform);
}
