/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, makeStyles, Tab, Tabs } from '@material-ui/core';
import _ from 'lodash';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { MappedFormControl } from './MappedControl';
import TabPanel from '../components/TabPanel';
import DataGridView from './DataGridView';
import { SCHEMA_STATE_ACTIONS } from '.';
import { InputSQL } from '../components/FormComponents';
import gettext from 'sources/gettext';
import { evalFunc } from 'sources/utils';
import CustomPropTypes from '../custom_prop_types';
import { useOnScreen } from '../custom_hooks';
import { DepListenerContext } from './DepListener';
import FieldSetView from './FieldSetView';

const useStyles = makeStyles((theme)=>({
  fullSpace: {
    padding: 0,
    height: '100%'
  },
  controlRow: {
    paddingBottom: theme.spacing(1),
  },
  nestedTabPanel: {
    backgroundColor: theme.otherVars.headerBg,
  },
  nestedControl: {
    height: 'unset',
  }
}));

/* Optional SQL tab */
function SQLTab({active, getSQLValue}) {
  const [sql, setSql] = useState('Loading...');
  useEffect(()=>{
    let unmounted = false;
    if(active) {
      setSql('Loading...');
      getSQLValue().then((value)=>{
        if(!unmounted) {
          setSql(value);
        }
      });
    }
    return ()=>{unmounted=true;};
  }, [active]);

  return <InputSQL
    value={sql}
    options={{
      readOnly: true,
    }}
    isAsync={true}
    readonly={true}
  />;
}

SQLTab.propTypes = {
  active: PropTypes.bool,
  getSQLValue: PropTypes.func.isRequired,
};

export function getFieldMetaData(field, schema, value, viewHelperProps, onlyModeCheck=false) {
  let retData = {
    readonly: false,
    disabled: false,
    visible: true,
    canAdd: true,
    canEdit: false,
    canDelete: true,
    modeSupported: true,
    canAddRow: true,
  };

  if(field.mode) {
    retData.modeSupported = (field.mode.indexOf(viewHelperProps.mode) > -1);
  }
  if(!retData.modeSupported) {
    return retData;
  }

  if(onlyModeCheck) {
    return retData;
  }

  let {visible, disabled, readonly} = field;

  let verInLimit = (_.isUndefined(viewHelperProps.serverInfo) ? true :
    ((_.isUndefined(field.server_type) ? true :
      (viewHelperProps.serverInfo.type in field.server_type)) &&
      (_.isUndefined(field.min_version) ? true :
        (viewHelperProps.serverInfo.version >= field.min_version)) &&
      (_.isUndefined(field.max_version) ? true :
        (viewHelperProps.serverInfo.version <= field.max_version))));

  let _readonly = viewHelperProps.inCatalog || (viewHelperProps.mode == 'properties');
  if(!_readonly) {
    _readonly = evalFunc(schema, readonly, value);
  }
  retData.readonly = _readonly;

  let _visible = verInLimit;
  _visible = _visible && evalFunc(schema, _.isUndefined(visible) ? true : visible, value);
  retData.visible = Boolean(_visible);

  retData.disabled = Boolean(evalFunc(schema, disabled, value));

  let {canAdd, canEdit, canDelete, canAddRow } = field;
  retData.canAdd = _.isUndefined(canAdd) ? retData.canAdd : evalFunc(schema, canAdd, value);
  retData.canEdit = _.isUndefined(canEdit) ? retData.canEdit : evalFunc(schema, canEdit, value);
  retData.canDelete = _.isUndefined(canDelete) ? retData.canDelete : evalFunc(schema, canDelete, value);
  retData.canAddRow = _.isUndefined(canAddRow) ? retData.canAddRow : evalFunc(schema, canAddRow, value);
  return retData;
}

/* The first component of schema view form */
export default function FormView({
  value, formErr, schema={}, viewHelperProps, isNested=false, accessPath, dataDispatch, hasSQLTab,
  getSQLValue, onTabChange, firstEleRef, className, isDataGridForm=false, isTabView=true, visible}) {
  let defaultTab = 'General';
  let tabs = {};
  let tabsClassname = {};
  const [tabValue, setTabValue] = useState(0);
  const classes = useStyles();
  const firstElement = useRef();
  const formRef = useRef();
  const onScreenTracker = useRef(false);
  const depListener = useContext(DepListenerContext);
  let groupLabels = {};
  const schemaRef = useRef(schema);

  let isOnScreen = useOnScreen(formRef);
  if(isOnScreen) {
    /* Don't do it when the form is alredy visible */
    if(onScreenTracker.current == false) {
      /* Re-select the tab. If form is hidden then sometimes it is not selected */
      setTabValue(tabValue);
      onScreenTracker.current = true;
    }
  } else {
    onScreenTracker.current = false;
  }

  useEffect(()=>{
    /* Calculate the fields which depends on the current field */
    if(!isDataGridForm) {
      schemaRef.current.fields.forEach((field)=>{
        /* Self change is also dep change */
        if(field.depChange || field.deferredDepChange) {
          depListener.addDepListener(accessPath.concat(field.id), accessPath.concat(field.id), field.depChange, field.deferredDepChange);
        }
        (evalFunc(null, field.deps) || []).forEach((dep)=>{
          let source = accessPath.concat(dep);
          if(_.isArray(dep)) {
            source = dep;
          }
          if(field.depChange) {
            depListener.addDepListener(source, accessPath.concat(field.id), field.depChange);
          }
        });
      });
      return ()=>{
        /* Cleanup the listeners when unmounting */
        depListener.removeDepListener(accessPath);
      };
    }
  }, []);

  let fullTabs = [];

  /* Prepare the array of components based on the types */
  schemaRef.current.fields.forEach((field)=>{
    let {visible, disabled, readonly, canAdd, canEdit, canDelete, canAddRow, modeSupported} =
      getFieldMetaData(field, schema, value, viewHelperProps);

    if(modeSupported) {
      let {group, CustomControl} = field;
      group = groupLabels[group] || group || defaultTab;

      if(!tabs[group]) tabs[group] = [];

      /* Lets choose the path based on type */
      if(field.type === 'nested-tab') {
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schemaRef.current.top;
        } else {
          field.schema.top = schema;
        }
        tabs[group].push(
          <FormView key={`nested${tabs[group].length}`} value={value} viewHelperProps={viewHelperProps} formErr={formErr}
            schema={field.schema} accessPath={accessPath} dataDispatch={dataDispatch} isNested={true} isDataGridForm={isDataGridForm}
            {...field} visible={visible}/>
        );
      } else if(field.type === 'nested-fieldset') {
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schemaRef.current.top;
        } else {
          field.schema.top = schema;
        }
        tabs[group].push(
          <FieldSetView key={`nested${tabs[group].length}`} value={value} viewHelperProps={viewHelperProps} formErr={formErr}
            schema={field.schema} accessPath={accessPath} dataDispatch={dataDispatch} isNested={true} isDataGridForm={isDataGridForm}
            controlClassName={classes.controlRow}
            {...field} visible={visible}/>
        );
      } else if(field.type === 'collection') {
        /* If its a collection, let data grid view handle it */
        let depsMap = [value[field.id]];
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schemaRef.current.top;
        } else {
          field.schema.top = schemaRef.current;
        }

        depsMap.push(canAdd, canEdit, canDelete, visible);

        if(!_.isUndefined(field.fixedRows)) {
          canAdd = false;
          canDelete = false;
        }

        const props = {
          key: field.id, value: value[field.id], viewHelperProps: viewHelperProps, formErr: formErr,
          schema: field.schema, accessPath: accessPath.concat(field.id), dataDispatch: dataDispatch,
          containerClassName: classes.controlRow, ...field, canAdd: canAdd, canEdit: canEdit, canDelete: canDelete,
          visible: visible, canAddRow: canAddRow,
        };

        if(CustomControl) {
          tabs[group].push(<CustomControl {...props}/>);
        } else {
          tabs[group].push(<DataGridView {...props}/>);
        }
      } else if(field.type === 'group') {
        groupLabels[field.id] = field.label;
        if(!visible) {
          schemaRef.current.filterGroups.push(field.label);
        }
      } else {
        /* Its a form control */
        const hasError = field.id == formErr.name;
        /* When there is a change, the dependent values can change
         * lets pass the new changes to dependent and get the new values
         * from there as well.
         */
        if(field.isFullTab) {
          tabsClassname[group] = classes.fullSpace;
          fullTabs.push(group);
        }

        const id = field.id || `control${tabs[group].length}`;

        tabs[group].push(
          useMemo(()=><MappedFormControl
            inputRef={(ele)=>{
              if(firstEleRef && !firstEleRef.current) {
                firstEleRef.current = ele;
              }
            }}
            state={value}
            key={id}
            viewHelperProps={viewHelperProps}
            name={id}
            value={value[id]}
            {...field}
            id={id}
            readonly={readonly}
            disabled={disabled}
            visible={visible}
            onChange={(value)=>{
              /* Get the changes on dependent fields as well */
              dataDispatch({
                type: SCHEMA_STATE_ACTIONS.SET_VALUE,
                path: accessPath.concat(id),
                value: value,
              });
            }}
            hasError={hasError}
            className={classes.controlRow}
            noLabel={field.isFullTab}
          />, [
            value[id],
            readonly,
            disabled,
            visible,
            hasError,
            classes.controlRow,
            ...(evalFunc(null, field.deps) || []).map((dep)=>value[dep]),
          ])
        );
      }
    }
  });

  /* Add the SQL tab if required */
  let sqlTabActive = false;
  let sqlTabName = gettext('SQL');
  if(hasSQLTab) {
    sqlTabActive = (Object.keys(tabs).length === tabValue);
    /* Re-render and fetch the SQL tab when it is active */
    tabs[sqlTabName] = [
      useMemo(()=><SQLTab key="sqltab" active={sqlTabActive} getSQLValue={getSQLValue} />, [sqlTabActive]),
    ];
    tabsClassname[sqlTabName] = classes.fullSpace;
    fullTabs.push(sqlTabName);
  }

  useEffect(()=>{
    firstElement.current && firstElement.current.focus();
  }, []);

  useEffect(()=>{
    onTabChange && onTabChange(tabValue, Object.keys(tabs)[tabValue], sqlTabActive);
  }, [tabValue]);

  /* check whether form is kept hidden by visible prop */
  if(!_.isUndefined(visible) && !visible) {
    return <></>;
  }

  let finalTabs = _.pickBy(tabs, (v, tabName)=>schemaRef.current.filterGroups.indexOf(tabName) <= -1);
  if(isTabView) {
    return (
      <>
        <Box height="100%" display="flex" flexDirection="column" className={className} ref={formRef}>
          <Box>
            <Tabs
              value={tabValue}
              onChange={(event, selTabValue) => {
                setTabValue(selTabValue);
              }}
              // indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              action={(ref)=>ref && ref.updateIndicator()}
            >
              {Object.keys(finalTabs).map((tabName)=>{
                return <Tab key={tabName} label={tabName} />;
              })}
            </Tabs>
          </Box>
          {Object.keys(finalTabs).map((tabName, i)=>{
            return (
              <TabPanel key={tabName} value={tabValue} index={i} classNameRoot={clsx(tabsClassname[tabName], isNested ? classes.nestedTabPanel : null)}
                className={fullTabs.indexOf(tabName) == -1 ? classes.nestedControl : null}>
                {finalTabs[tabName]}
              </TabPanel>
            );
          })}
        </Box>
      </>);
  } else {
    return (
      <>
        <Box height="100%" display="flex" flexDirection="column" className={className} ref={formRef}>
          {Object.keys(finalTabs).map((tabName)=>{
            return (
              <React.Fragment key={tabName}>{finalTabs[tabName]}</React.Fragment>
            );
          })}
        </Box>
      </>);
  }
}

FormView.propTypes = {
  value: PropTypes.any,
  formErr: PropTypes.object,
  schema: CustomPropTypes.schemaUI.isRequired,
  viewHelperProps: PropTypes.object,
  isNested: PropTypes.bool,
  isDataGridForm: PropTypes.bool,
  visible: PropTypes.oneOfType([
    PropTypes.bool, PropTypes.func,
  ]),
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  hasSQLTab: PropTypes.bool,
  getSQLValue: PropTypes.func,
  onTabChange: PropTypes.func,
  firstEleRef: CustomPropTypes.ref,
  className: CustomPropTypes.className,
};
