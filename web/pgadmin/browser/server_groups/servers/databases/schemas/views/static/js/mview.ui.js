/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import { isEmptyString } from 'sources/validators';


export default class MViewSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, getVacuumSettingsSchema, fieldOptions={}, initValues) {
    super({
      spcname: undefined,
      toast_autovacuum_enabled: 'x',
      autovacuum_enabled: 'x',
      warn_text: undefined,
      ...initValues
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.getVacuumSettingsSchema = getVacuumSettingsSchema;
    this.fieldOptions = {
      role: [],
      schema: [],
      spcname: [],
      nodeInfo: null,
      ...fieldOptions,
    };

    this.nodeInfo = this.fieldOptions.nodeInfo;
  }

  get idAttribute() {
    return 'oid';
  }

  inSchema() {
    if(this.nodeInfo && 'catalog' in this.nodeInfo)
    {
      return true;
    }
    return false;
  }


  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', disabled: obj.inSchema, noEmpty: true,
      },{
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      },{
        id: 'owner', label: gettext('Owner'),
        type: 'select', cell: 'text',
        options: obj.fieldOptions.role, controlProps: { allowClear: false },
        disabled: obj.inSchema,
      },{
        id: 'schema', label: gettext('Schema'), cell: 'text',
        type: 'select', options: obj.fieldOptions.schema, mode: ['create', 'edit'],
        cache_node: 'database', disabled: obj.inSchema,
        controlProps: {
          allowClear: false,
          first_empty: false
        },
      },{
        id: 'system_view', label: gettext('System materialized view?'), cell: 'text',
        type: 'switch', mode: ['properties'],
      },
      {
        id: 'acl', label: gettext('Privileges'),
        mode: ['properties'], type: 'text', group: gettext('Security'),
      },{
        id: 'comment', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      },{
        id: 'definition', label: gettext('Definition'), cell: 'text',
        type: 'sql', mode: ['create', 'edit'], group: gettext('Definition'),
        isFullTab: true, controlProps: { readOnly: this.nodeInfo && 'catalog' in this.nodeInfo ? true: false },
      },{
        id: 'with_data', label: gettext('With data?'),
        group: gettext('Storage'), mode: ['edit', 'create'],
        type: 'switch',
      },{
        id: 'spcname', label: gettext('Tablespace'), cell: 'text',
        type: 'select', group: gettext('Storage'),
        options: obj.fieldOptions.spcname,
        controlProps: {
          allowClear: false,
          first_empty: false,
        },
      },{
        id: 'fillfactor', label: gettext('Fill factor'),
        group: gettext('Storage'), mode: ['edit', 'create'],
        noEmpty: false, type: 'int', controlProps: {min: 10, max: 100}
      },{
        id: 'vacuum_settings_str', label: gettext('Storage settings'),
        type: 'multiline', group: gettext('Storage'), mode: ['properties'],
      },
      {
        type: 'nested-tab', group: gettext('Parameter'), mode: ['create', 'edit'],
        schema: this.getVacuumSettingsSchema(),
      },
      /*{
        type: 'nested', control: 'tab', id: 'materialization',
        label: gettext('Parameter'), mode: ['edit', 'create'],
        group: gettext('Parameter'),
        schema: Backform.VacuumSettingsSchema,
      },
      {
        // Add Privilege Control
        id: 'datacl', label: gettext('Privileges'), type: 'collection',
        model: pgBrowser.Node.PrivilegeRoleModel.extend({
          privileges: ['a', 'r', 'w', 'd', 'D', 'x', 't'],
        }), uniqueCol : ['grantee'], editable: false,
        group: 'security', canAdd: true, canDelete: true,
        mode: ['edit', 'create'], control: 'unique-col-collection',
      },*/
      {
        id: 'datacl', label: gettext('Privileges'), type: 'collection',
        schema: this.getPrivilegeRoleSchema(['U']),
        uniqueCol : ['grantee'],
        editable: false,
        group: gettext('Security'), mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
      },
      {
      // Add Security Labels Control
        id: 'seclabels', label: gettext('Security labels'),
        schema: new SecLabelSchema(),
        editable: false, type: 'collection',
        canEdit: false, group: gettext('Security'), canDelete: true,
        mode: ['edit', 'create'], canAdd: true,
        control: 'unique-col-collection',
        uniqueCol : ['provider'],
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    let obj = this;

    if (isEmptyString(state.service)) {

      /* mview definition validation*/
      if (isEmptyString(state.definition)) {
        errmsg = gettext('Please enter view definition.');
        setError('definition', errmsg);
        return true;
      } else {
        errmsg = null;
        setError('definition', errmsg);
      }

      if (state.definition) {
        obj.warningText = null;
        if (obj.origData.oid !== undefined && state.definition !== obj.origData.definition) {
          obj.warningText = gettext(
            'Updating the definition will drop and re-create the materialized view. It may result in loss of information about its dependent objects.'
          ) + '<br><br><b>' + gettext('Do you want to continue?') + '</b>';
        }
      }
      return false;
    } else {
      errmsg = null;
      _.each(['definition'], (item) => {
        setError(item, errmsg);
      });
    }
  }
}
