import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import _ from 'lodash';
import { isEmptyString } from 'sources/validators';
import { SCHEMA_STATE_ACTIONS } from '../../../../../../../../../../static/js/SchemaView';
import DataGridViewWithHeaderForm from '../../../../../../../../../../static/js/helpers/DataGridViewWithHeaderForm';
import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../../../static/js/node_ajax';

export function getNodeForeignKeySchema(treeNodeInfo, itemNodeData, pgBrowser, noColumns=false) {
  return new ForeignKeySchema({
    local_column: noColumns ? [] : ()=>getNodeListByName('column', treeNodeInfo, itemNodeData),
    references: ()=>getNodeAjaxOptions('all_tables', pgBrowser.Nodes['table'], treeNodeInfo, itemNodeData, {cacheLevel: 'server'}, (rows)=>{
      return rows.map((r)=>({
        'value': r.value,
        'image': 'icon-table',
        'label': r.label,
        oid: r.oid,
      }));
    }),
  },
  treeNodeInfo,
  (params)=>{
    return getNodeAjaxOptions('get_columns', pgBrowser.Nodes['table'], treeNodeInfo, itemNodeData, {urlParams: params, useCache:false}, (rows)=>{
      return rows.map((r)=>({
        'value': r.name,
        'image': 'icon-column',
        'label': r.name,
      }));
    });
  });
}

class ForeignKeyHeaderSchema extends BaseUISchema {
  constructor(fieldOptions, getColumns) {
    super({
      local_column: undefined,
      references: undefined,
      referenced: undefined,
    });

    this.fieldOptions = fieldOptions;
    this.getColumns = getColumns;
  }

  changeColumnOptions(columns) {
    this.fieldOptions.local_column = columns;
  }

  addDisabled(state) {
    return !(state.local_column && state.references && state.referenced);
  }

  /* Data to ForeignKeyColumnSchema will added using the header form */
  getNewData(data) {
    let references_table_name = _.find(this.refTables, (t)=>t.value==data.references)?.label;
    return {
      local_column: data.local_column,
      referenced: data.referenced,
      references: data.references,
      references_table_name: references_table_name,
    };
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'local_column', label: gettext('Local column'), type:'select', editable: false,
      options: this.fieldOptions.local_column,
      optionsReloadBasis: this.fieldOptions.local_column?.map ? _.join(this.fieldOptions.local_column.map((c)=>c.label), ',') : null,
    },{
      id: 'references', label: gettext('References'), type: 'select', editable: false,
      options: this.fieldOptions.references,
      optionsReloadBasis: this.fieldOptions.references?.map ? _.join(this.fieldOptions.references.map((c)=>c.label), ',') : null,
      optionsLoaded: (rows)=>obj.refTables=rows,
    },{
      id: 'referenced', label: gettext('Referencing'), editable: false, deps: ['references'],
      type: (state)=>{
        return {
          type: 'select',
          options: state.references ? ()=>this.getColumns({tid: state.references}) : [],
          optionsReloadBasis: state.references,
        };
      },
    }];
  }
}

class ForeignKeyColumnSchema extends BaseUISchema {
  constructor() {
    super({
      local_column: undefined,
      referenced: undefined,
      references: undefined,
      references_table_name: undefined,
    });
  }

  get baseFields() {
    return [{
      id: 'local_column', label: gettext('Local'), type:'text', editable: false,
      cell:'', minWidth: 145,
    },{
      id: 'referenced', label: gettext('Referenced'), type: 'text', editable: false,
      cell:'', minWidth: 145,
    },{
      id: 'references_table_name', label: gettext('Referenced Table'), type: 'text', editable: false,
      cell:'', minWidth: 145,
    }];
  }
}

export default class ForeignKeySchema extends BaseUISchema {
  constructor(fieldOptions={}, nodeInfo, getColumns) {
    super({
      name: undefined,
      reftab: undefined,
      oid: undefined,
      is_sys_obj: undefined,
      comment: undefined,
      condeferrable: undefined,
      condeferred: undefined,
      confmatchtype: false,
      convalidated: undefined,
      columns: undefined,
      confupdtype: 'a',
      confdeltype: 'a',
      autoindex: true,
      coveringindex: undefined,
      hasindex:undefined,
    });

    this.nodeInfo = nodeInfo;

    this.fkHeaderSchema = new ForeignKeyHeaderSchema(fieldOptions, getColumns);
    this.fkHeaderSchema.fkObj = this;
    this.fkColumnSchema = new ForeignKeyColumnSchema();

  }

  get idAttribute() {
    return 'oid';
  }

  get inTable() {
    if(_.isUndefined(this.nodeInfo)) {
      return true;
    }
    return !_.isUndefined(this.nodeInfo['table']);
  }

  changeColumnOptions(columns) {
    this.fkHeaderSchema.changeColumnOptions(columns);
  }

  isReadonly(state) {
    // If we are in table edit mode then
    if(this.top) {
      return !_.isUndefined(state.oid);
    }
    return !this.isNew(state);
  }

  get baseFields() {
    let obj = this;

    return [{
      id: 'name', label: gettext('Name'), type: 'text', cell: 'text',
      mode: ['properties', 'create', 'edit'], editable:true,
    },{
      id: 'oid', label: gettext('OID'), cell: 'string',
      type: 'text' , mode: ['properties'],
    },{
      id: 'is_sys_obj', label: gettext('System foreign key?'),
      type: 'switch', mode: ['properties'],
    },{
      id: 'comment', label: gettext('Comment'), cell: 'text',
      type: 'multiline', mode: ['properties', 'create', 'edit'],
      deps:['name'], disabled:function(state) {
        if(isEmptyString(state.name)) {
          return true;
        }
        return false;
      }, depChange: (state)=>{
        if(isEmptyString(state.name)) {
          return {comment: ''};
        }
      }
    },{
      id: 'condeferrable', label: gettext('Deferrable?'),
      type: 'switch', group: gettext('Definition'),
      readonly: obj.isReadonly,
    },{
      id: 'condeferred', label: gettext('Deferred?'),
      type: 'switch', group: gettext('Definition'),
      deps: ['condeferrable'],
      disabled: function(state) {
        // Disable if condeferred is false or unselected.
        if(state.condeferrable) {
          return false;
        } else {
          return true;
        }
      },
      readonly: obj.isReadonly,
      depChange: (state)=>{
        if(!state.condeferrable) {
          return {condeferred: false};
        }
      }
    },{
      id: 'confmatchtype', label: gettext('Match type'),
      type: 'toggle', group: gettext('Definition'),
      options: [
        {label: 'FULL', value: true},
        {label: 'SIMPLE', value: false},
      ], readonly: obj.isReadonly,
    },{
      id: 'convalidated', label: gettext('Validated?'),
      type: 'switch', group: gettext('Definition'),
      readonly: (state)=>{
        // If we are in table edit mode then
        if(obj.inTable && obj.top && !obj.top.isNew()) {
          return !(_.isUndefined(state.oid) || !state.convalidated);
        }
        if(!obj.isNew(state) && obj.origData.convalidated) {
          return true;
        }
        return false;
      },
    },{
      id: 'autoindex', label: gettext('Auto FK index?'),
      type: 'switch', group: gettext('Definition'),
      deps: ['name', 'hasindex'],
      disabled: (state)=>{
        if(!obj.isNew(state)) {
          return true;
        }
        // If we are in table edit mode then
        if(obj.inTable) {
          // user is trying to add new constraint which should allowed for Unique
          if(obj.isNew(state)) {
            return true;
          }
        } else {
          if(!obj.isNew(state) && state.autoindex && !isEmptyString(state.coveringindex)
            && state.hasindex) {
            return true;
          }
        }
        if(state.hasindex) {
          return true;
        }
        return false;
      },
      depChange: (state, source, topState, actionObj)=>{
        if(!obj.isNew(state)) {
          return {};
        }
        // If we are in table edit mode then
        if(obj.inTable) {
          // user is trying to add new constraint which should allowed for Unique
          if(obj.isNew(state)) {
            return {autoindex: false, coveringindex: ''};
          }
        }

        let oldindex = 'fki_'+actionObj.oldState.name;
        if(state.hasindex) {
          return {};
        } else if(!state.autoindex) {
          return {coveringindex: ''};
        } else if(state.autoindex && !isEmptyString(state.name) &&
            (isEmptyString(state.coveringindex) || oldindex == state.coveringindex)){
          return {coveringindex: 'fki_'+state.name};
        }
      },
    },{
      id: 'coveringindex', label: gettext('Covering index'), type: 'text',
      mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
      deps:['autoindex', 'hasindex'],
      disabled: (state)=>{
        if(!obj.isNew(state) && state.autoindex && !isEmptyString(state.coveringindex)) {
          return true;
        }
        if(state.hasindex) {
          return true;
        } else if(!state.autoindex) {
          return true;
        } else {
          return false;
        }
      },
      readonly: this.isReadonly,
    },{
      id: 'references_table_name', label: gettext('Referenced Table'),
      type: 'text', group: gettext('Columns'), editable: false, visible:false,
      cell: '', deps: ['columns'],
      depChange: (state)=>{
        if(state.columns?.length > 0) {
          return {references_table_name: _.join(_.map(state.columns, 'references_table_name'), ',')};
        }
        return {references_table_name: undefined};
      }
    },{
      id: 'columns', label: gettext('Columns'),
      group: gettext('Columns'), type: 'collection',
      mode: ['create', 'edit'],
      editable: false, schema: this.fkColumnSchema,
      headerSchema: this.fkHeaderSchema, headerVisible: (state)=>obj.isNew(state),
      CustomControl: DataGridViewWithHeaderForm,
      uniqueCol: ['local_column', 'references', 'referenced'],
      canAdd: false, canDelete: function(state) {
        // We can't update columns of existing foreign key.
        return obj.isNew(state);
      },
      readonly: obj.isReadonly, cell: ()=>({
        cell: '',
        controlProps: {
          formatter: {
            fromRaw: (rawValue)=>{
              var cols = [],
                remoteCols = [];
              if (rawValue?.length > 0) {
                rawValue.forEach((col)=>{
                  cols.push(col.local_column);
                  remoteCols.push(col.referenced);
                });
                return '('+cols.join(', ')+') -> ('+ remoteCols.join(', ')+')';
              }
              return '';
            },
          }
        },
        minWidth: 245,
      }),
      deps: ()=>{
        let ret = [];
        if(obj.inTable) {
          ret.push(['columns']);
        }
        return ret;
      },
      depChange: (state, source, topState, actionObj)=>{
        /* If in table, sync up value with columns in table */
        if(obj.inTable && !state) {
          /* the FK is removed by some other dep, this can be a no-op */
          return;
        }
        let currColumns = state.columns || [];
        if(obj.inTable && source[0] == 'columns') {
          if(actionObj.type == SCHEMA_STATE_ACTIONS.DELETE_ROW) {
            let oldColumn = _.get(actionObj.oldState, actionObj.path.concat(actionObj.value));
            currColumns = _.filter(currColumns, (cc)=>cc.local_column != oldColumn.name);
          } else if(actionObj.type == SCHEMA_STATE_ACTIONS.SET_VALUE) {
            let tabColPath = _.slice(actionObj.path, 0, -1);
            let oldColName = _.get(actionObj.oldState, tabColPath).name;
            let idx = _.findIndex(currColumns, (cc)=>cc.local_column == oldColName);
            if(idx > -1) {
              currColumns[idx].local_column = _.get(topState, tabColPath).name;
            }
          }
        }
        return {columns: currColumns};
      },
    },{
      id: 'confupdtype', label: gettext('On update'),
      type:'select', group: gettext('Action'), mode: ['edit','create'],
      controlProps:{allowClear: false},
      options: [
        {label: 'NO ACTION', value: 'a'},
        {label: 'RESTRICT', value: 'r'},
        {label: 'CASCADE', value: 'c'},
        {label: 'SET NULL', value: 'n'},
        {label: 'SET DEFAULT', value: 'd'},
      ], readonly: obj.isReadonly,
    },{
      id: 'confdeltype', label: gettext('On delete'),
      type:'select', group: gettext('Action'), mode: ['edit','create'],
      select2:{allowClear: false},
      options: [
        {label: 'NO ACTION', value: 'a'},
        {label: 'RESTRICT', value: 'r'},
        {label: 'CASCADE', value: 'c'},
        {label: 'SET NULL', value: 'n'},
        {label: 'SET DEFAULT', value: 'd'},
      ], readonly: obj.isReadonly,
    }];
  }

  validate(state, setError) {
    if ((_.isUndefined(state.columns) || _.isNull(state.columns) || state.columns.length < 1)) {
      setError('columns', gettext('Please specify columns for Foreign key.'));
      return true;
    }

    if (this.isNew(state)){
      if (state.autoindex && isEmptyString(state.coveringindex)) {
        setError('coveringindex', gettext('Please specify covering index name.'));
        return true;
      }
    }

    return false;
  }
}
