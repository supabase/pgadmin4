/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The DataGridView component is based on react-table component */

import React, { useCallback, useMemo, useState } from 'react';
import { Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { PgIconButton } from '../components/Buttons';
import AddIcon from '@material-ui/icons/AddOutlined';
import { MappedCellControl } from './MappedControl';
import EditRoundedIcon from '@material-ui/icons/EditRounded';
import DeleteRoundedIcon from '@material-ui/icons/DeleteRounded';
import { useTable, useBlockLayout, useResizeColumns, useSortBy, useExpanded } from 'react-table';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import _ from 'lodash';

import gettext from 'sources/gettext';
import { SCHEMA_STATE_ACTIONS } from '.';
import FormView from './FormView';
import { confirmDeleteRow } from '../helpers/legacyConnector';
import CustomPropTypes from 'sources/custom_prop_types';
import { evalFunc } from 'sources/utils';

const useStyles = makeStyles((theme)=>({
  grid: {
    ...theme.mixins.panelBorder,
    backgroundColor: theme.palette.background.default,
  },
  gridHeader: {
    display: 'flex',
    ...theme.mixins.panelBorder.bottom,
    backgroundColor: theme.otherVars.headerBg,
  },
  gridHeaderText: {
    padding: theme.spacing(0.5, 1),
    fontWeight: theme.typography.fontWeightBold,
  },
  gridControls: {
    marginLeft: 'auto',
  },
  gridControlsButton: {
    border: 0,
    borderRadius: 0,
    ...theme.mixins.panelBorder.left,
  },
  gridRowButton: {
    border: 0,
    borderRadius: 0,
    padding: 0,
    minWidth: 0,
    backgroundColor: 'inherit',
  },
  gridTableContainer: {
    overflow: 'auto',
    width: '100%',
  },
  table: {
    borderSpacing: 0,
    width: '100%',
    overflow: 'auto',
    backgroundColor: theme.otherVars.tableBg,
  },
  tableCell: {
    margin: 0,
    padding: theme.spacing(0.5),
    ...theme.mixins.panelBorder.bottom,
    ...theme.mixins.panelBorder.right,
    position: 'relative',
    textAlign: 'center'
  },
  tableCellHeader: {
    fontWeight: theme.typography.fontWeightBold,
    padding: theme.spacing(1, 0.5),
    textAlign: 'left',
  },
  resizer: {
    display: 'inline-block',
    width: '5px',
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    transform: 'translateX(50%)',
    zIndex: 1,
    touchAction: 'none',
  },
}));

function DataTableHeader({headerGroups}) {
  const classes = useStyles();
  return (
    <div>
      {headerGroups.map((headerGroup, hi) => (
        <div key={hi} {...headerGroup.getHeaderGroupProps()}>
          {headerGroup.headers.map((column, ci) => (
            <div key={ci} {...column.getHeaderProps()}>
              <div {...(column.sortable ? column.getSortByToggleProps() : {})} className={clsx(classes.tableCell, classes.tableCellHeader)}>
                {column.render('Header')}
                <span>
                  {column.isSorted
                    ? column.isSortedDesc
                      ? ' 🔽'
                      : ' 🔼'
                    : ''}
                </span>
              </div>
              {column.resizable &&
                <div
                  {...column.getResizerProps()}
                  className={classes.resizer}
                />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

DataTableHeader.propTypes = {
  headerGroups: PropTypes.array.isRequired,
};

function DataTableRow({row, totalRows, canExpand, isResizing, viewHelperProps, formErr, schema, dataDispatch, accessPath}) {
  const classes = useStyles();
  const [key, setKey] = useState(false);
  // let key = useRef(true);
  /* Memoize the row to avoid unnecessary re-render.
   * If table data changes, then react-table re-renders the complete tables
   * We can avoid re-render by if row data is not changed
   */
  let depsMap = _.values(row.original, Object.keys(row.original).filter((k)=>!k.startsWith('btn')));
  depsMap = depsMap.concat([totalRows, row.isExpanded, key, isResizing]);
  return (
    useMemo(()=>
      <>
        <div {...row.getRowProps()} className="tr">
          {row.cells.map((cell, ci) => {
            return (
              <div key={ci} {...cell.getCellProps()} className={classes.tableCell}>
                {cell.render('Cell', {
                  reRenderRow: ()=>{setKey((currKey)=>!currKey);}
                })}
              </div>
            );
          })}
        </div>
        {
          canExpand && row.isExpanded &&
          <FormView key={row.index} value={row.original} viewHelperProps={viewHelperProps} formErr={formErr} dataDispatch={dataDispatch}
            schema={schema} accessPath={accessPath} isNested={true}/>
        }
      </>
    , depsMap)
  );
}

export default function DataGridView({
  value, viewHelperProps, formErr, schema, accessPath, dataDispatch, containerClassName, ...props}) {
  const classes = useStyles();
  /* Calculate the fields which depends on the current field
  deps has info on fields which the current field depends on. */
  const dependsOnField = useMemo(()=>{
    let res = {};
    schema.fields.forEach((field)=>{
      (field.deps || []).forEach((dep)=>{
        res[dep] = res[dep] || [];
        res[dep].push(field.id);
      });
    });
    return res;
  }, []);
  let columns = useMemo(
    ()=>{
      let cols = [];
      if(props.canEdit) {
        let colInfo = {
          Header: <>&nbsp;</>,
          id: 'btn-edit',
          accessor: ()=>{},
          resizable: false,
          sortable: false,
          dataType: 'edit',
          width: 30,
          minWidth: '0',
          Cell: ({row})=><PgIconButton data-test="expand-row" title={gettext('Edit row')} icon={<EditRoundedIcon />} className={classes.gridRowButton}
            onClick={()=>{
              row.toggleRowExpanded(!row.isExpanded);
            }}
          />
        };
        colInfo.Cell.displayName = 'Cell',
        colInfo.Cell.propTypes = {
          row: PropTypes.object.isRequired,
        };
        cols.push(colInfo);
      }
      if(props.canDelete) {
        let colInfo = {
          Header: <>&nbsp;</>,
          id: 'btn-delete',
          accessor: ()=>{},
          resizable: false,
          sortable: false,
          dataType: 'delete',
          width: 30,
          minWidth: '0',
          Cell: ({row}) => {
            return (
              <PgIconButton data-test="delete-row" title={gettext('Delete row')} icon={<DeleteRoundedIcon />}
                onClick={()=>{
                  confirmDeleteRow(()=>{
                    dataDispatch({
                      type: SCHEMA_STATE_ACTIONS.DELETE_ROW,
                      path: accessPath,
                      value: row.index,
                    });
                  }, ()=>{}, props.customDeleteTitle, props.customDeleteMsg);
                }} className={classes.gridRowButton} />
            );
          }
        };
        colInfo.Cell.displayName = 'Cell',
        colInfo.Cell.propTypes = {
          row: PropTypes.object.isRequired,
        };
        cols.push(colInfo);
      }

      cols = cols.concat(
        schema.fields
          .map((field)=>{
            let colInfo = {
              Header: field.label,
              accessor: field.id,
              field: field,
              resizable: true,
              sortable: true,
              ...(field.minWidth ?  {minWidth: field.minWidth} : {}),
              Cell: ({value, row, ...other}) => {
                let {visible, disabled, readonly, ..._field} = field;

                let verInLimit = (_.isUndefined(viewHelperProps.serverInfo) ? true :
                  ((_.isUndefined(field.server_type) ? true :
                    (viewHelperProps.serverInfo.type in field.server_type)) &&
                  (_.isUndefined(field.min_version) ? true :
                    (viewHelperProps.serverInfo.version >= field.min_version)) &&
                  (_.isUndefined(field.max_version) ? true :
                    (viewHelperProps.serverInfo.version <= field.max_version))));
                let _readonly = viewHelperProps.inCatalog || (viewHelperProps.mode == 'properties');
                if(!_readonly) {
                  _readonly = evalFunc(readonly, row.original || {});
                }

                let _visible = true;
                if(visible) {
                  _visible = evalFunc(visible, row.original || {});
                }
                _visible = _visible && verInLimit;

                disabled = evalFunc(disabled, row.original || {});

                return <MappedCellControl rowIndex={row.index} value={value}
                  row={row.original} {..._field}
                  readonly={_readonly}
                  disabled={disabled}
                  visible={_visible}
                  onCellChange={(value)=>{
                    /* Get the changes on dependent fields as well.
                     * The return value of depChange function is merged and passed to state.
                     */
                    const depChange = (state)=>{
                      let rowdata = _.get(state, accessPath.concat(row.index));
                      _field.depChange && _.merge(rowdata, _field.depChange(rowdata, _field.id) || {});
                      (dependsOnField[_field.id] || []).forEach((d)=>{
                        d = _.find(schema.fields, (f)=>f.id==d);
                        if(d.depChange) {
                          _.merge(rowdata, d.depChange(rowdata, _field.id) || {});
                        }
                      });
                      return state;
                    };
                    dataDispatch({
                      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
                      path: accessPath.concat([row.index, _field.id]),
                      value: value,
                      depChange: depChange,
                    });
                  }}
                  reRenderRow={other.reRenderRow}
                />;
              },
            };
            colInfo.Cell.displayName = 'Cell',
            colInfo.Cell.propTypes = {
              row: PropTypes.object.isRequired,
              value: PropTypes.any,
              onCellChange: PropTypes.func,
            };
            return colInfo;
          })
      );
      return cols;
    },[]);

  const onAddClick = useCallback(()=>{
    let newRow = {};
    columns.forEach((column)=>{
      if(column.field) {
        newRow[column.field.id] = schema.defaults[column.field.id];
      }
    });
    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: accessPath,
      value: newRow,
    });
  });

  const defaultColumn = useMemo(()=>({
    minWidth: 175,
  }));

  let tablePlugins = [
    useBlockLayout,
    useResizeColumns,
    useSortBy,
  ];
  if(props.canEdit) {
    tablePlugins.push(useExpanded);
  }
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    {
      columns,
      data: value || [],
      defaultColumn,
      manualSortBy: true,
      autoResetSortBy: false,
      autoResetExpanded: false,
    },
    ...tablePlugins,
  );

  const isResizing = _.flatMap(headerGroups, headerGroup => headerGroup.headers.map(col=>col.isResizing)).includes(true);

  return (
    <Box className={containerClassName}>
      <Box className={classes.grid}>
        <Box className={classes.gridHeader}>
          <Box className={classes.gridHeaderText}>{props.label}</Box>
          <Box className={classes.gridControls}>
            {props.canAdd && <PgIconButton data-test="add-row" title={gettext('Add row')} onClick={onAddClick} icon={<AddIcon />} className={classes.gridControlsButton} />}
          </Box>
        </Box>
        <div {...getTableProps()} className={classes.table}>
          <DataTableHeader headerGroups={headerGroups} />
          <div {...getTableBodyProps()}>
            {rows.map((row, i) => {
              prepareRow(row);
              return <DataTableRow key={i} row={row} totalRows={rows.length} canExpand={props.canEdit}
                value={value} viewHelperProps={viewHelperProps} formErr={formErr} isResizing={isResizing}
                schema={schema} accessPath={accessPath.concat([row.index])} dataDispatch={dataDispatch} />;
            })}
          </div>
        </div>
      </Box>
    </Box>
  );
}

DataGridView.propTypes = {
  label: PropTypes.string,
  value: PropTypes.array,
  viewHelperProps: PropTypes.object,
  formErr: PropTypes.object,
  schema: CustomPropTypes.schemaUI,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func.isRequired,
  containerClassName: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  canEdit: PropTypes.bool,
  canAdd: PropTypes.bool,
  canDelete: PropTypes.bool,
  customDeleteTitle: PropTypes.string,
  customDeleteMsg: PropTypes.string,
};
