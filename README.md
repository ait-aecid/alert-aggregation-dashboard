# AMiner CTI Dashboard

A Kibana plugin

---

## Ansible installation

To install the AMiner CTI dashboard run:
> ansible-playbook site.yml

Under `hosts` you can specify in which hosts the dashboard is to be installed.

You can specify the dashboard version (wrt. to Kibana version) in `roles > aminer-cti > defaults > main.yml`


## Manual installation

To install the AMiner CTI Kibana plugin, choose the appropriate version and run:

> sudo /usr/share/kibana/bin/kibana-plugin install file:///path/to/aminer-7.10.x.zip

The zip files can be found under `roles > aminer-cti > plugins`

After the successful plugin installation, restart Kibana with:

`sudo systemctl restart kibana`

## Notes

In case of plugin reinstallation, remove the already installed plugin using:
> sudo rm -r /usr/share/kibana/plugins/aminer