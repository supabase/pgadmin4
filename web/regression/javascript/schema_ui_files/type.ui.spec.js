/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import pgAdmin from 'sources/pgadmin';
import {messages} from '../fake_messages';
import { createMount } from '@material-ui/core/test-utils';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import gettext from 'sources/gettext';
import { integerValidator } from 'sources/validators';
import { getNodePrivilegeRoleSchema } from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';

import TypeSchema, { EnumerationSchema, getCompositeSchema, getExternalSchema, getRangeSchema, getDataTypeSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/types/static/js/type.ui';

describe('TypeSchema', ()=>{

  let mount;
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
    pgAdmin.Browser.utils.support_ssh_tunnel = true;
  });

  describe('composite schema describe', () => {

    let compositeCollObj = getCompositeSchema({}, {server: {user: {name: 'postgres'}}}, {});
    let types = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric[]', length: true, min_val: 10, max_val: 100, precision: true, is_collatable: true}];
    let collations = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric[]'}];

    it('composite collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
      spyOn(compositeCollObj.fieldOptions, 'types').and.returnValue(types);
      spyOn(compositeCollObj.fieldOptions, 'collations').and.returnValue(collations);

      spyOn(compositeCollObj, 'type_options').and.returnValue(compositeCollObj.fieldOptions.types());

      mount(<SchemaView
        formType='dialog'
        schema={compositeCollObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);

      mount(<SchemaView
        formType='dialog'
        schema={compositeCollObj}
        viewHelperProps={{
          mode: 'edit',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        getInitData={getInitData}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);
    });

    it('composite validate', () => {
      let state = { typtype: 'b' }; //validating for ExternalSchema which is distinguish as r
      let setError = jasmine.createSpy('setError');

      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('member_name', 'Please specify the value for member name.');

      state.member_name = 'demo_member';
      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('type', 'Please specify the type.');

      state.type = 'char';
      state.min_val = 10;
      state.max_val = 100;
      state.is_tlength = true;
      state.tlength = 9;
      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('tlength', gettext('Length/Precision should not be less than %s.', state.min_val));

      state.tlength = 200;
      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('tlength', gettext('Length/Precision should not be greater than %s.', state.max_val));

      state.tlength = 'ert';
      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('tlength', integerValidator('Length/Precision', state.tlength));

      state.tlength = 90;
      state.is_precision = true;
      state.precision = 'ert';
      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('precision', integerValidator('Scale', state.precision));

      state.precision = 9;
      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalled();
    });

    it('tlength editable', ()=>{
      compositeCollObj.type_options = types;
      let editable = _.find(compositeCollObj.fields, (f)=>f.id=='tlength').editable;
      let status = editable({type: 'numeric[]'});
      expect(status).toBe(true);
    });

    it('precision editable', ()=>{
      compositeCollObj.type_options = types;
      let editable = _.find(compositeCollObj.fields, (f)=>f.id=='precision').editable;
      let status = editable({type: 'numeric[]'});
      expect(status).toBe(true);
    });

    it('collation editable', ()=>{
      compositeCollObj.type_options = types;
      let editable = _.find(compositeCollObj.fields, (f)=>f.id=='collation').editable;
      let status = editable({type: 'numeric[]'});
      expect(status).toBe(true);
    });

    it('setTypeOptions', ()=>{
      compositeCollObj.setTypeOptions(types);
    });
  });

  describe('enumeration schema describe', () => {

    it('enumeration collection', ()=>{

      let enumerationCollObj = new EnumerationSchema(
        ()=>[],
        ()=>[]
      );

      mount(<SchemaView
        formType='dialog'
        schema={enumerationCollObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);

      mount(<SchemaView
        formType='dialog'
        schema={enumerationCollObj}
        viewHelperProps={{
          mode: 'edit',
        }}
        onSave={()=>{}}
        getInitData={getInitData}
        onClose={()=>{}}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);
    });
  });

  describe('external schema describe', () => {

    let externalCollObj = getExternalSchema({}, {server: {user: {name: 'postgres'}}}, {});

    it('external collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
      spyOn(externalCollObj.fieldOptions, 'externalFunctionsList').and.returnValue([{ label: '', value: ''}, { label: 'lb1', cbtype: 'typmodin', value: 'val1'}, { label: 'lb2', cbtype: 'all', value: 'val2'}]);
      spyOn(externalCollObj.fieldOptions, 'types').and.returnValue([{ label: '', value: ''}]);

      mount(<SchemaView
        formType='dialog'
        schema={externalCollObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);

      mount(<SchemaView
        formType='dialog'
        schema={externalCollObj}
        viewHelperProps={{
          mode: 'edit',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        getInitData={getInitData}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);
    });

    it('external validate', () => {
      let state = { typtype: 'b' }; //validating for ExternalSchema which is distinguish as r
      let setError = jasmine.createSpy('setError');

      externalCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typinput', 'Input function cannot be empty');

      state.typinput = 'demo_input';
      externalCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typoutput', 'Output function cannot be empty');
    });
  });

  describe('range schema describe', () => {

    let rangeCollObj = getRangeSchema({}, {server: {user: {name: 'postgres'}}}, {});

    it('range collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
      spyOn(rangeCollObj.fieldOptions, 'getSubOpClass').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      spyOn(rangeCollObj.fieldOptions, 'getCanonicalFunctions').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      spyOn(rangeCollObj.fieldOptions, 'getSubDiffFunctions').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      spyOn(rangeCollObj.fieldOptions, 'typnameList').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      spyOn(rangeCollObj.fieldOptions, 'collationsList').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);

      mount(<SchemaView
        formType='dialog'
        schema={rangeCollObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);

      mount(<SchemaView
        formType='dialog'
        schema={rangeCollObj}
        viewHelperProps={{
          mode: 'edit',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        getInitData={getInitData}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);
    });

    it('range validate', () => {
      let state = { typtype: 'r' }; //validating for RangeSchema which is distinguish as r
      let setError = jasmine.createSpy('setError');

      rangeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typname', 'Subtype cannot be empty');
    });
  });

  describe('data type schema describe', () => {

    let dataTypeObj = getDataTypeSchema({}, {server: {user: {name: 'postgres'}}}, {});
    let types = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric', length: true, min_val: 10, max_val: 100, precision: true}];

    it('data type collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);

      mount(<SchemaView
        formType='dialog'
        schema={dataTypeObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);

      mount(<SchemaView
        formType='dialog'
        schema={dataTypeObj}
        viewHelperProps={{
          mode: 'edit',
        }}
        onSave={()=>{}}
        getInitData={getInitData}
        onClose={()=>{}}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />);
    });

    it('tlength editable', ()=>{
      dataTypeObj.type_options = types;
      let editable = _.find(dataTypeObj.fields, (f)=>f.id=='tlength').editable;
      let status = editable({type: 'numeric', type_options: types});
      expect(status).toBe(true);
    });

    it('tlength disabled', ()=>{
      dataTypeObj.type_options = types;
      let disabled = _.find(dataTypeObj.fields, (f)=>f.id=='tlength').disabled;
      let status = disabled({type: 'numeric', type_options: types});
      expect(status).toBe(false);
    });

    it('precision editable', ()=>{
      dataTypeObj.type_options = types;
      let editable = _.find(dataTypeObj.fields, (f)=>f.id=='precision').editable;
      let status = editable({type: 'numeric', type_options: types});
      expect(status).toBe(true);
    });

    it('precision disabled', ()=>{
      dataTypeObj.type_options = types;
      let disabled = _.find(dataTypeObj.fields, (f)=>f.id=='precision').disabled;
      let status = disabled({type: 'numeric', type_options: types});
      expect(status).toBe(false);
    });
  });

  let typeSchemaObj = new TypeSchema(
    (privileges)=>getNodePrivilegeRoleSchema({}, {server: {user: {name: 'postgres'}}}, {}, privileges),
    ()=>getCompositeSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    ()=>getRangeSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    ()=>getExternalSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    ()=>getDataTypeSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    {
      roles: ()=>[],
      schemas: ()=>[{ label: 'pg_demo', value: 'pg_demo'}],
      server_info: [],
      node_info: {'schema': []}
    },
    {
      typowner: 'postgres',
      schema: 'public',
      typtype: 'c'
    }
  );

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={typeSchemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('edit', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={typeSchemaObj}
      viewHelperProps={{
        mode: 'edit',
      }}
      onSave={()=>{}}
      getInitData={getInitData}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('properties', ()=>{
    mount(<SchemaView
      formType='tab'
      schema={typeSchemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{}}
      onEdit={()=>{}}
    />);
  });
});