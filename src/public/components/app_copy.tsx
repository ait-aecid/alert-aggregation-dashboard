import React, { useState, useEffect, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';
import moment from 'moment';
import dagre from 'dagre';
import Table from './tables';

import {
  EuiButton,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiCallOut,
  EuiBasicTable,
  EuiTextColor,
} from '@elastic/eui';

import {
  Chart,
  LineSeries, 
  Axis,
  Settings,
  ScaleType,
  timeFormatter,
  niceTimeFormatByDay,
} from '@elastic/charts';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import { CoreStart } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import {
  DataPublicPluginStart,
  IndexPattern,
  QueryState,
  Query,
} from '../../../../src/plugins/data/public';

interface AminerAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  uiSettings: CoreStart['uiSettings'];
}

export const AminerApp = ({ basename, notifications, http, navigation }: AminerAppDeps) => {
  // indexes
  const alertIndex = "alerts*";
  const groupIndex = "alert-groups*";
  const metaIndex = "meta-alerts*";
  
  const now = Date.now();
  const querySize = 50;
  const aggsBuckets = 20;
  var aggsInterval = "1h";
  const [ error, setError ] = useState();
  // alert vars
  const alertUrl = "/data";
  var alertSearchAfter = [now];
  const alertSort = ["id:desc"];
  const [ alerts, setAlerts ] = useState([]);
  const [ totalAlerts, setTotalAlerts ] = useState(0);
  const [ alertAggs, setAlertAggs ] = useState([]);
  const [ alertChartData, setAlertChartData ] = useState([]);
  const [ alertQuery, setAlertQuery ] = useState(null);
  // alert-group vars
  var groupSearchAfter = [now];
  const groupSort = ["group_id:desc"];
  const groupUrl = "/data";
  const [ groups, setGroups ] = useState([]);
  const [ totalGroups, setTotalGroups ] = useState(0);
  const [ groupQuery, setgroupQuery ] = useState(null);
  // meta-alert vars
  var metaSearchAfter = [now];
  const metaSort = ["id:desc"];
  const metaUrl = "/data";
  const [ metas, setMetas ] = useState([]);
  const [ totalMetas, setTotalMetas ] = useState(0);
  const [ metaQuery, setMetaQuery ] = useState(null);
  const [ metaAggs, setMetaAggs ] = useState([]);
  const [ metaChartData, setMetaChartData ] = useState([]);
  // selections
  let [ isAlertSelectable, setIsAlertSelectable] = useState(true);
  let [ isGroupSelectable, setIsGroupSelectable] = useState(true);
  let [ isMetaSelectable, setIsMetaSelectable] = useState(true);
  const alertTable = useRef();
  const groupTable = useRef();
  const metaTable = useRef();
  const [ idsForAlerts, setIdsForAlerts ] = useState(null);
  const [ idsForGroups, setIdsForGroups ] = useState(null);
  const [ idsForMetas, setIdsForMetas ] = useState(null);
  // set cached datetime
  let dateRangeFrom = null;
  let dateRangeTo = null;
  let kibanaTimeHistory = localStorage.getItem('kibana.timepicker.timeHistory');
  if (kibanaTimeHistory) {
    kibanaTimeHistory = JSON.parse(kibanaTimeHistory);
    if (kibanaTimeHistory && kibanaTimeHistory.length) {
      const lastDateRange = kibanaTimeHistory[0];
      dateRangeFrom = lastDateRange.from;
      dateRangeTo = lastDateRange.to;
    };
  };
  let dateRangeFilter = {"range": {"@timestamp": {"gte": dateRangeFrom, "lte": dateRangeTo}}};
  let aggs = {"hits_over_time": {"auto_date_histogram": {"field": "@timestamp", "buckets": aggsBuckets}}};

  // const getSelections = (key, objs) => 
  //   const ids = JSON.parse(localStorage.getItem(key));
  //   if (objs && ids) {
  //     return objs.filter((obj) => ids.includes(obj._id));
  //   };
  //   return [];
  // };
  // let selectedAlerts = [];
  // let selectedGroups = []; 
  // let selectedMetas = [];


  // Callback of TopNavMenu; called on mount
  const onQuerySubmit = (query) => {
    const { dateRange } = query;
    if (dateRange) {
      if (dateRange.from && dateRange.to) {        
        let groupIds = JSON.parse(localStorage.getItem('groupIds'));
        let metaIds = JSON.parse(localStorage.getItem('metaIds'));
        // groupIds = (groupIds != null && groupIds != undefined) ? groupIds : [];
        // metaIds = (metaIds != null && metaIds != undefined) ? metaIds : [];
        let ids = {
          "groupIds": groupIds,
          "metaIds": metaIds,
        };
        // set cached selections
        setIdsForAlerts(ids);
        setIdsForGroups(ids);
        setIdsForMetas(ids);
      };
    };
  };

  useEffect(() => {
    if (idsForAlerts) {
      let filter = [dateRangeFilter];
      if (idsForAlerts.groupIds) {
        let groupTerm = {"terms": {"groups": idsForAlerts.groupIds}};
        filter.push(groupTerm);
      };
      if (idsForAlerts.metaIds) {
        let metaTerm = {"terms": {"meta_alerts": idsForAlerts.metaIds}};
        filter.push(metaTerm);
      };
      const query = {
        "bool": {
          "filter": filter
        }
      };
      const Q = {
        index: alertIndex,
        size: querySize,
        sort: alertSort,
        body: {
          search_after: alertSearchAfter,
          aggs: aggs,
          query: query
        }
      };
      setAlertQuery(Q);
      fetchAlerts(Q);
    };
  }, [idsForAlerts]);

  useEffect(() => {
    if (idsForGroups) {
      let filter = [dateRangeFilter];
      if (idsForGroups.groupIds) {
        let groupTerm = {"terms": {"group_id": idsForGroups.groupIds}};
        filter.push(groupTerm);
      };
      if (idsForGroups.metaIds) {
        let metaTerm = {"terms": {"meta_alert_id": idsForGroups.metaIds}};
        filter.push(metaTerm);
      };
      const query = {
        "bool": {
          "filter": filter
        }
      };
      const Q = {
        index: groupIndex,
        size: querySize,
        sort: groupSort,
        body: {
          search_after: groupSearchAfter,
          aggs: aggs,
          query: query
        }
      };
      setgroupQuery(Q);
      fetchGroups(Q)
    };
  }, [idsForGroups]);

  useEffect(() => {
    if (idsForMetas) {
      let filter = [dateRangeFilter];
      if (idsForMetas.metaIds) {
        let metaTerm = {"terms": {"id": idsForMetas.metaIds}};
        filter.push(metaTerm);
      };
      const query = {
        "bool": {
          "filter": filter
        }
      };
      const Q = {
        index: metaIndex,
        size: querySize,
        sort: metaSort,
        body: {
          search_after: metaSearchAfter,
          aggs: aggs,
          query: query
        }
      };
      setMetaQuery(Q);
      fetchMetas(Q);
    };
  }, [idsForMetas]);


  useEffect(() => {
    if (alertAggs && alertAggs.hits_over_time) {
      const buckets = alertAggs.hits_over_time.buckets;
      const chartData = buckets.map(bucket => 
        [bucket.key, bucket.doc_count]
      );
      setAlertChartData(chartData);
    };
  }, [alertAggs]);

  useEffect(() => {
    if (metaAggs && metaAggs.hits_over_time) {
      const buckets = metaAggs.hits_over_time.buckets;
      const chartData = buckets.map(bucket => 
        [bucket.key, bucket.doc_count]
      );
      // setMetaChartData(chartData);
    };
  }, [metaAggs]);

  // ----------------- Fetchers --------------------- //

  const fetchData = async (url, q) => {
    const response = await http.get(url, {
      query: {
        body: JSON.stringify(q)
      },
    }).then((resp) => {
      // if (resp.error) {
      //   //setError(resp.error);
      // }
      return resp;
    }).catch((error) => {
      notifications.toasts.addDanger({
        title: 'Query result',
        text: 'An error has occurred when calling the backend',
      });
    });
    return response;
  };

  const resetAlerts = () => {
    setAlerts([]);
    setTotalAlerts(0);
    setAlertChartData([]);
  };

  const resetMetas = () => {
    setMetas([]);
    setTotalMetas(0);
    setMetaChartData([]);
  };

  const resetGroups = () => {
    setGroups([]);
    setTotalGroups(0);
  };

  const fetchAlerts = (query) => {
    fetchData(alertUrl, query).then((resp) => {
      if (resp) {
          if (resp.data) {
            if(resp.data.hits && resp.data.hits.total) {
              setTotalAlerts(resp.data.hits.total.value);
            };
            setAlerts(resp.data.hits.hits); 
            if (resp.data.aggregations)
              setAlertAggs(resp.data.aggregations);
          } else {
            resetAlerts()
          }; 
        };
    });
  };

  const fetchMetas = (query) => {
    fetchData(metaUrl, query).then((resp) => {
      if (resp) {
          if (resp.data) {
            if(resp.data.hits && resp.data.hits.total) {
              setTotalMetas(resp.data.hits.total.value);
            };
            setMetas(resp.data.hits.hits); 
            if (resp.data.aggregations)
              setMetaAggs(resp.data.aggregations);
          } else {
            resetMetas();
          }; 
        };
    });
  };

  const fetchGroups = (query) => {
    fetchData(groupUrl, query).then((resp) => {
      if (resp) {
          if (resp.data) {
            if(resp.data.hits && resp.data.hits.total) {
              setTotalGroups(resp.data.hits.total.value);
            };
            setGroups(resp.data.hits.hits); 
          } else {
            resetGroups();
          }; 
        };
    });
  };

  const fetchMoreAlerts = () => {
    // update sarch_after from sort in last hit 
    if (alerts.length > 0) {
      const [ lastHit ] = alerts.slice(-1);
      alertSearchAfter = lastHit['sort'];
    };
    const newQuery = {...alertQuery, body: {...alertQuery.body, search_after: alertSearchAfter}};
    fetchData(alertUrl, newQuery).then((resp) => {
      setAlerts(alerts.concat(resp.data.hits.hits));
    });
  };

  const fetchMoreMetas = () => {
    // update sarch_after from sort in last hit 
    if (metas.length > 0) {
      const [ lastHit ] = metas.slice(-1);
      metaSearchAfter = lastHit['sort'];
    };
    const newQuery = {...metaQuery, body: {...metaQuery.body, search_after: metaSearchAfter}};
    fetchData(metaUrl, newQuery).then((resp) => {
      setMetas(metas.concat(resp.data.hits.hits));
    });
  };

  const fetchMoreGroups = () => {
    // update sarch_after from sort in last hit 
    if (groups.length > 0) {
      const [ lastHit ] = groups.slice(-1);
      groupSearchAfter = lastHit['sort'];
    };
    const newQuery = {...groupQuery, body: {...groupQuery.body, search_after: groupSearchAfter}};
    fetchData(groupUrl, newQuery).then((resp) => {
      setGroups(groups.concat(resp.data.hits.hits));
    });
  };

  const filterByAlert = (item) => {
    const { _source } = item;
    return {
      onClick: () => {
        const { meta_alerts, groups } = _source;
        let newFilter = {"terms": {"id": meta_alerts}}
        metaQuery.body.query.bool.filter.forEach((filter, index, arr) => {
          if (filter.hasOwnProperty('terms')) {
            arr[index] = newFilter;
          } else {
            arr.push(newFilter);
          };
        });
        fetchMetas(metaQuery);
      },
    };
  };

  const formatDate = (d) => {
    if (d) {
      return moment(d).format('DD.MM.YYYY, h:mm:ss.mmm');
    };
    return d;
  };

  const formatTickDate = (d) => {
    if (d) {
      return moment(d).format('DD.MM.YYYY, h:mm:ss');
    };
    return d;
  };

  const generateGraph = (metas) => {

    var g = new dagre.graphlib.Graph();

    // Set an object for the graph label
    g.setGraph({});

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function() { return {}; });

    // Add nodes to the graph. The first argument is the node id. The second is
    // metadata about the node. In this case we're going to add labels to each of
    // our nodes.
    g.setNode("kspacey",    { label: "Kevin Spacey",  width: 144, height: 100 });
    g.setNode("swilliams",  { label: "Saul Williams", width: 160, height: 100 });
    g.setNode("bpitt",      { label: "Brad Pitt",     width: 108, height: 100 });
    g.setNode("hford",      { label: "Harrison Ford", width: 168, height: 100 });
    g.setNode("lwilson",    { label: "Luke Wilson",   width: 144, height: 100 });
    g.setNode("kbacon",     { label: "Kevin Bacon",   width: 121, height: 100 });

    // Add edges to the graph.
    g.setEdge("kspacey",   "swilliams");
    g.setEdge("swilliams", "kbacon");
    g.setEdge("bpitt",     "kbacon");
    g.setEdge("hford",     "lwilson");
    g.setEdge("lwilson",   "kbacon");
    dagre.layout(g);

  };

  const onAlertSelectionChange = (alerts) => {    
    let selectedGroupIds = [];
    let selectedMetaIds = [];

    if (alerts && alerts.length) {
      // get meta-alert and group IDs
      alerts.forEach((alert, index, arr) => {
        const { meta_alerts, groups } = alert._source;
        groups.forEach((groupId, idx, arra) => {
          if (!selectedGroupIds.includes(groupId)) {
            selectedGroupIds.push(groupId)
          };
        });
        meta_alerts.forEach((maId, idx, arra) => {
          if (!selectedMetaIds.includes(maId)) {
            selectedMetaIds.push(maId)
          };
        });
      });
      setIsGroupSelectable(false);
      setIsMetaSelectable(false);
    } else {
      setIsGroupSelectable(true);
      setIsMetaSelectable(true);
    };

    selectedGroupIds = (selectedGroupIds.length>0) ? selectedGroupIds : null;
    selectedMetaIds = (selectedMetaIds.length>0) ? selectedMetaIds : null;

    let ids = {
      "groupIds": selectedGroupIds,
      "metaIds": selectedMetaIds
    };

    setIdsForGroups(ids);
    setIdsForMetas(ids);

    localStorage.setItem('groupIds', JSON.stringify(selectedGroupIds));
    localStorage.setItem('metaIds', JSON.stringify(selectedMetaIds));
  };

  const onGroupSelection = (groups) => {
    let selectedGroupIds = [];
    let selectedMetaIds = [];

    if (groups && groups.length) {
      groups.forEach((group, index, arr) => {
        const { group_id, meta_alert_id } = group._source;
        selectedGroupIds.push(group_id);
        selectedMetaIds.push(meta_alert_id);
      });
      setIsAlertSelectable(false);
      setIsMetaSelectable(false);
    } else {
      setIsAlertSelectable(true);
      setIsMetaSelectable(true);
    };

    selectedGroupIds = (selectedGroupIds.length>0) ? selectedGroupIds : null;
    selectedMetaIds = (selectedMetaIds.length>0) ? selectedMetaIds : null;

    let ids = {
      "groupIds": selectedGroupIds,
      "metaIds": selectedMetaIds
    };

    setIdsForAlerts(ids);
    setIdsForMetas(ids);

    localStorage.setItem('groupIds', JSON.stringify(selectedGroupIds));
    localStorage.setItem('metaIds', JSON.stringify(selectedMetaIds));
  };

  const onMetaSelection = (metas) => {
    let selectedMetaIds = [];
    if (metas && metas.length) {
      metas.forEach((meta, index, arr) => {
        const { id } = meta._source;
        selectedMetaIds.push(id);
      });
    setIsAlertSelectable(false);
    setIsGroupSelectable(false);
  } else {
    setIsAlertSelectable(true);
    setIsGroupSelectable(true);
  };

    selectedMetaIds = (selectedMetaIds.length>0) ? selectedMetaIds : null;

    let ids = {
      "groupIds": idsForGroups.groupIds,
      "metaIds": selectedMetaIds
    };

    setIdsForAlerts(ids);
    setIdsForGroups(ids);

    localStorage.setItem('metaIds', JSON.stringify(selectedMetaIds));
  };

  const alertSelection = {
    selectable: (alert) => isAlertSelectable,
    onSelectionChange: onAlertSelectionChange,
  };

  const groupSelection = {
    selectable: (group) => isGroupSelectable,
    onSelectionChange: onGroupSelection,
  };

  const metaSelection = {
    selectable: (meta) => isMetaSelectable,
    onSelectionChange: onMetaSelection,
  };


  const alertCols = [
    {
      field: '_source.@timestamp',
      name: 'Timestamp',
      sortable: true,
      dataType: 'date',
      render: (d) => formatDate(d),
    },
    {
      field: '_source.d.AnalysisComponent.AnalysisComponentName',
      name: 'Component',
      // render: (hit) => renderComponentName(hit)
    },
    {
      field: '_source.d.AnalysisComponent.Message',
      name: 'Message',
      // render: (hit) => renderHit(hit)
    },
    {
      field: '_source.groups',
      name: 'Groups',
      // render: (hit) => renderHit(hit)
    },
    {
      field: '_source.meta_alerts',
      name: 'Meta-Alerts',
      // render: (hit) => renderHit(hit)
    },
  ];

  const alertGroupCols = [
    {
      field: '_source.@timestamp',
      name: 'Timestamp',
      sortable: true,
      dataType: 'date',
      render: (d) => formatDate(d),
    },
    {
      field: '_source.group_id',
      name: 'ID',
    },    
    {
      field: '_source.meta_alert_id',
      name: 'Meta-Alert',
    }, 
    // {
    //   field: '_source.delta',
    //   name: 'Delta',
    // },
    {
      field: '_source.alert_count',
      name: 'Alert count',
    },
  ];

  const metaCols = [
    {
      field: '_source.@timestamp',
      name: 'Timestamp',
      sortable: true,
      dataType: 'date',
      render: (d) => formatDate(d),
    },
    {
      field: '_source.id',
      name: 'ID',
    },    
    // {
    //   field: '_source.delta',
    //   name: 'Delta',
    // },
    {
      field: '_source.alert_count',
      name: 'Alert count',
    },
  ];

  // Render the application DOM.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <div style={{ padding: "1em 3em 3em" }}>


          { (error) && 
            <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
              <p>
                { error }
              </p>
            </EuiCallOut>
          }

          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="m">
                <h4>CTI Dashboard</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <navigation.ui.TopNavMenu
                appName={PLUGIN_ID}
                showSearchBar={true}
                useDefaultBehaviors={true}
                onQuerySubmit={onQuerySubmit}
                dateRangeFrom={dateRangeFrom}
                dateRangeTo={dateRangeTo}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          
          <EuiSpacer />

          {/* tables */}
          <EuiFlexGroup >
              <EuiFlexItem>
                <EuiPanel>
                    {/* <EuiTitle size="xxs" className="eui-textCenter">
                        <h4>{ totalAlerts } hits</h4>
                    </EuiTitle> */}
                    <Chart size={{height: 250}}>
                        <Settings
                        showLegend={true}
                        showLegendExtra={true}
                        legendPosition="right"
                        />
                        <Axis
                        title="Count"
                        id="left-axis"
                        position="left"
                        showGridLines
                        />
                        <Axis
                        title={"@timestamp"}
                        id="bottom-axis"
                        position="bottom"
                        tickFormat={(d) => formatTickDate(d)} //niceTimeFormatByDay(1)
                        />                  
                        <LineSeries
                        id="alerts"
                        name="Alerts"
                        data={alertChartData}
                        xScaleType={ScaleType.Time}
                        yScaleType={ScaleType.Linear}
                        xAccessor={0}
                        yAccessors={[1]}
                        />
                        <LineSeries
                        id="metas"
                        name="Meta-Alerts"
                        data={metaChartData}
                        xScaleType={ScaleType.Time}
                        yScaleType={ScaleType.Linear}
                        xAccessor={0}
                        yAccessors={[1]}                   
                        />
                  </Chart>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup> 

          <EuiSpacer />
{/* 
          {
            (selectedMetas.length>0) && "selectedMetas"
          } */}
          
          <EuiSpacer />


          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={5}>
              <EuiTitle size="s">
                <h4>
                  Alerts
                  <EuiTextColor color="subdued" style={{ "fontSize": "16px", "marginLeft": "8px" }}> 
                    { (alerts.length > 0) && alerts.length + " of " + totalAlerts}
                    { (alerts.length > 0 && totalAlerts==10000) && "+"}
                  </EuiTextColor>
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiPanel style={{ "overflowY": "scroll", height: "580px" }}>
                <EuiBasicTable
                  ref={alertTable}
                  columns={alertCols} 
                  items={alerts}                          
                  // rowProps={filterByAlert}
                  isSelectable={true}
                  selection={alertSelection}
                  itemId="_id"
                />
                <EuiSpacer />
                {
                  alerts.length > 0 && totalAlerts > alerts.length &&
                  <EuiButton 
                    fill
                    fullWidth={true}
                    onClick={fetchMoreAlerts}>
                    Load more
                  </EuiButton>
                }
                <EuiSpacer />
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem grow={5}>
              <EuiTitle size="s">
                <h4>
                  Alert Groups
                  <EuiTextColor color="subdued" style={{ "fontSize": "16px", "marginLeft": "8px" }}> 
                    { (groups.length > 0) && groups.length + " of " + totalGroups}
                    { (groups.length > 0 && totalAlerts==10000) && "+"}
                  </EuiTextColor>
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiPanel style={{ "overflowY": "scroll", height: "580px" }}>
                <EuiBasicTable
                  ref={groupTable}
                  columns={alertGroupCols} 
                  items={groups}                          
                  // rowProps={filterByAlert}
                  isSelectable={true}
                  selection={groupSelection}
                  itemId="_id"
                />
                <EuiSpacer />
                {
                  groups.length > 0 && totalGroups > groups.length &&
                  <EuiButton 
                    fill
                    fullWidth={true}
                    onClick={fetchMoreGroups}>
                    Load more
                  </EuiButton>
                }
                <EuiSpacer />
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem grow={5}>
              <EuiTitle size="s">
                <h4>
                  Meta-Alerts
                  <EuiTextColor color="subdued" style={{ "fontSize": "16px", "marginLeft": "8px" }}> 
                    { (metas.length > 0) && metas.length + " of " + totalMetas}
                    { (metas.length > 0 && totalMetas==10000) && "+"}
                  </EuiTextColor>
                </h4>              
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiPanel style={{ "overflowY": "scroll", height: "580px" }}>
                
                <EuiBasicTable
                  ref={metaTable}
                  columns={metaCols} 
                  items={metas}          
                  isSelectable={true}
                  selection={metaSelection}        
                  itemId="_id"        
                />
                <EuiSpacer />
                {
                  metas.length > 0 && totalMetas > metas.length &&
                  <EuiButton 
                    fill
                    fullWidth={true}
                    onClick={fetchMoreMetas}>
                    Load more
                  </EuiButton>
                }
                <EuiSpacer />
              </EuiPanel>
            </EuiFlexItem>
          
          </EuiFlexGroup>
          
          <EuiSpacer />

        </div>
      </I18nProvider>
    </Router>
  );
};
