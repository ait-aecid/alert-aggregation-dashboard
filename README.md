# AMiner CTI Dashboard

A Kibana plugin

---

## Ansible installation
To install the AMiner CTI dashboard run:
> ansible-playbook site.yml

Under `hosts` you can specify in which hosts the dashboard is to be installed.

Please configure the Elasticsearch server IP containing the AMiner anomalies at `roles > aminer-cti > configs > aminer.yml`

You can specify the dashboard version (wrt. to Kibana version) in `roles > aminer-cti > defaults > main.yml`


## Manual installation

To install the AMiner CTI Kibana plugin, choose the appropriate version and run:

> sudo /usr/share/kibana/bin/kibana-plugin install file:///path/to/soc-7.x.x.zip --allow-root

The zip files can be found under `roles > aminer-cti > plugins`

The configuration of the plugin *must* be defined at this path: `/etc/kibana/aminer.yml`

Example of the yml configuration file:

```
ELASTIC_HOST: http://localhost:9200
```

After the successful plugin installation, restart Kibana with:

`sudo systemctl restart kibana`

