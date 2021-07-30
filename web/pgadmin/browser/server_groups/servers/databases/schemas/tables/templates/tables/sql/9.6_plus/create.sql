{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% import 'macros/variable.macros' as VARIABLE %}
{% import 'columns/macros/security.macros' as COLUMN_SECLABEL %}
{% import 'columns/macros/privilege.macros' as COLUMN_PRIVILEGE %}
{% import 'tables/sql/macros/constraints.macro' as CONSTRAINTS %}
{% import 'types/macros/get_full_type_sql_format.macros' as GET_TYPE %}
{#===========================================#}
{#====== MAIN TABLE TEMPLATE STARTS HERE ======#}
{#===========================================#}
{#
 If user has not provided any details but only name then
 add empty bracket with table name
#}
{% set empty_bracket = ""%}
{% if data.coll_inherits|length == 0 and  data.columns|length == 0 and not data.typname and not data.like_relation and data.primary_key|length == 0 and data.unique_constraint|length == 0 and data.foreign_key|length == 0 and data.check_constraint|length == 0 and data.exclude_constraint|length == 0 %}
{% set empty_bracket = "\n(\n)"%}
{% endif %}
CREATE {% if data.relpersistence %}UNLOGGED {% endif %}TABLE IF NOT EXISTS {{conn|qtIdent(data.schema, data.name)}}{{empty_bracket}}
{% if data.typname %}
    OF {{ data.typname }}
{% endif %}
{% if data.like_relation or data.coll_inherits or data.columns|length > 0 or data.primary_key|length > 0 or data.unique_constraint|length > 0 or data.foreign_key|length > 0 or data.check_constraint|length > 0 or data.exclude_constraint|length > 0 %}
(
{% endif %}
{% if data.like_relation %}
    LIKE {{ data.like_relation }}{% if data.like_default_value %}

        INCLUDING DEFAULTS{% endif %}{% if data.like_constraints %}

        INCLUDING CONSTRAINTS{% endif %}{% if data.like_indexes %}

        INCLUDING INDEXES{% endif %}{% if data.like_storage %}

        INCLUDING STORAGE{% endif %}{% if data.like_comments %}

        INCLUDING COMMENTS{% endif %}{% if data.columns|length > 0 %},
{% endif %}

{% endif %}
{### Add columns ###}
{% if data.columns and data.columns|length > 0 %}
{% for c in data.columns %}
{% if c.name and c.cltype %}
    {% if c.inheritedfromtable %}-- Inherited from table {{c.inheritedfromtable}}: {% elif c.inheritedfromtype %}-- Inherited from type {{c.inheritedfromtype}}: {% endif %}{{conn|qtIdent(c.name)}} {% if is_sql %}{{c.displaytypname}}{% else %}{{ GET_TYPE.CREATE_TYPE_SQL(conn, c.cltype, c.attlen, c.attprecision, c.hasSqrBracket) }}{% endif %}{% if c.collspcname %} COLLATE {{c.collspcname}}{% endif %}{% if c.attnotnull %} NOT NULL{% endif %}{% if c.defval is defined and c.defval is not none and c.defval != '' %} DEFAULT {{c.defval}}{% endif %}
{% if not loop.last %},
{% endif %}
{% endif %}
{% endfor %}
{% endif %}
{# Macro to render for constraints #}
{% if data.primary_key|length > 0 %}{% if data.columns|length > 0 %},{% endif %}
{{CONSTRAINTS.PRIMARY_KEY(conn, data.primary_key[0])}}{% endif %}{% if data.unique_constraint|length > 0 %}{% if data.columns|length > 0 or data.primary_key|length > 0 %},{% endif %}
{{CONSTRAINTS.UNIQUE(conn, data.unique_constraint)}}{% endif %}{% if data.foreign_key|length > 0 %}{% if data.columns|length > 0 or data.primary_key|length > 0 or data.unique_constraint|length > 0 %},{% endif %}
{{CONSTRAINTS.FOREIGN_KEY(conn, data.foreign_key)}}{% endif %}{% if data.check_constraint|length > 0 %}{% if data.columns|length > 0 or data.primary_key|length > 0 or data.unique_constraint|length > 0 or data.foreign_key|length > 0 %},{% endif %}
{{CONSTRAINTS.CHECK(conn, data.check_constraint)}}{% endif %}{% if data.exclude_constraint|length > 0 %}{% if data.columns|length > 0 or data.primary_key|length > 0 or data.unique_constraint|length > 0 or data.foreign_key|length > 0 or data.check_constraint|length > 0 %},{% endif %}
{{CONSTRAINTS.EXCLUDE(conn, data.exclude_constraint)}}{% endif %}
{% if data.like_relation or data.coll_inherits or data.columns|length > 0 or data.primary_key|length > 0 or data.unique_constraint|length > 0 or data.foreign_key|length > 0 or data.check_constraint|length > 0 or data.exclude_constraint|length > 0 %}

){% endif %}{% if data.relkind is defined and data.relkind == 'p' %} PARTITION BY {{ data.partition_scheme }} {% endif %}

{### If we are inheriting it from another table(s) ###}
{% if data.coll_inherits %}
    INHERITS ({% for val in data.coll_inherits %}{% if loop.index != 1 %}, {% endif %}{{val}}{% endfor %})
{% endif %}
WITH (
    OIDS = {% if data.relhasoids %}TRUE{% else %}FALSE{% endif %}{% if data.fillfactor %},
    FILLFACTOR = {{ data.fillfactor }}{% endif %}{% if data.parallel_workers is defined and data.parallel_workers != '' and data.parallel_workers != None %},
    parallel_workers = {{ data.parallel_workers }}{% endif %}{% if data.autovacuum_enabled in ('t', 'f') %},
    autovacuum_enabled = {% if data.autovacuum_enabled == 't' %}TRUE{% else %}FALSE{% endif %}{% endif %}{% if data.toast_autovacuum_enabled in ('t', 'f') %},
    toast.autovacuum_enabled = {% if data.toast_autovacuum_enabled == 't' %}TRUE{% else %}FALSE{% endif %}
{% endif %}{% if data.autovacuum_custom and data.vacuum_table|length > 0 %}
{% for opt in data.vacuum_table %}{% if opt.name and opt.value is defined %}
,
    {{opt.name}} = {{opt.value}}{% endif %}
{% endfor %}{% endif %}{% if data.toast_autovacuum and data.vacuum_toast|length > 0 %}
{% for opt in data.vacuum_toast %}{% if opt.name and opt.value is defined %}
,
    toast.{{opt.name}} = {{opt.value}}{% endif %}
{% endfor %}{% endif %}

{### SQL for Tablespace ###}
{% if data.spcname %}
)
TABLESPACE {{ conn|qtIdent(data.spcname) }};
{% else %}
);
{% endif %}
{### Alter SQL for Owner ###}
{% if data.relowner %}

ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    OWNER to {{conn|qtIdent(data.relowner)}};
{% endif %}


{#####################################################}
{## Enable Row Level Security Policy on table ##}
{#####################################################}
{% if data.rlspolicy %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    ENABLE ROW LEVEL SECURITY;
{% endif %}

{#####################################################}
{## Force Enable Row Level Security Policy on table ##}
{#####################################################}
{% if data.forcerlspolicy %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    FORCE ROW LEVEL SECURITY;
{% endif %}

{### Security Labels on Table ###}
{% if data.seclabels and data.seclabels|length > 0 %}

{% for r in data.seclabels %}
{{ SECLABEL.SET(conn, 'TABLE', data.name, r.provider, r.label, data.schema) }}
{% endfor %}
{% endif %}
{###  ACL on Table ###}
{% if data.revoke_all %}
{% for priv in data.revoke_all %}
{{ PRIVILEGE.UNSETALL(conn, "TABLE", priv, data.name, data.schema)}}
{% endfor %}
{% endif %}
{% if data.relacl %}

{% for priv in data.relacl %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{### SQL for COMMENT ###}
{% if data.description %}
COMMENT ON TABLE {{conn|qtIdent(data.schema, data.name)}}
    IS {{data.description|qtLiteral}};
{% endif %}
{#===========================================#}
{#====== MAIN TABLE TEMPLATE ENDS HERE ======#}
{#===========================================#}
{#===========================================#}
{#  COLUMN SPECIFIC TEMPLATES STARTS HERE    #}
{#===========================================#}
{% if data.columns and data.columns|length > 0 %}
{% for c in data.columns %}
{% if c.description %}

COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.name, c.name)}}
    IS {{c.description|qtLiteral}};
{% endif %}
{###  Add variables to column ###}
{% if c.attoptions and c.attoptions|length > 0 %}

ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    {{ VARIABLE.SET(conn, 'COLUMN', c.name, c.attoptions) }}

{% endif %}
{###  Alter column statistics value ###}
{% if c.attstattarget is defined and c.attstattarget > -1 %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    ALTER COLUMN {{conn|qtTypeIdent(c.name)}} SET STATISTICS {{c.attstattarget}};

{% endif %}
{###  Alter column storage value ###}
{% if c.attstorage is defined and c.attstorage != c.defaultstorage %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    ALTER COLUMN {{conn|qtTypeIdent(c.name)}} SET STORAGE {%if c.attstorage == 'p' %}
PLAIN{% elif c.attstorage == 'm'%}MAIN{% elif c.attstorage == 'e'%}
EXTERNAL{% elif c.attstorage == 'x'%}EXTENDED{% endif %};

{% endif %}
{###  ACL ###}
{% if c.attacl and c.attacl|length > 0 %}

{% for priv in c.attacl %}
    {{ COLUMN_PRIVILEGE.APPLY(conn, data.schema, data.name, c.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{###  Security Lables ###}
{% if c.seclabels and c.seclabels|length > 0 %}

{% for r in c.seclabels %}
{{ COLUMN_SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.name, c.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% endfor %}
{% endif %}
{#===========================================#}
{#   COLUMN SPECIFIC TEMPLATES ENDS HERE     #}
{#===========================================#}
{#======================================#}
{#   CONSTRAINTS SPECIFIC TEMPLATES     #}
{#======================================#}
{{CONSTRAINTS.CONSTRAINT_COMMENTS(conn, data.schema, data.name, data.primary_key)}}
{{CONSTRAINTS.CONSTRAINT_COMMENTS(conn, data.schema, data.name, data.unique_constraint)}}
{{CONSTRAINTS.CONSTRAINT_COMMENTS(conn, data.schema, data.name, data.foreign_key)}}
{{CONSTRAINTS.CONSTRAINT_COMMENTS(conn, data.schema, data.name, data.check_constraint)}}
{{CONSTRAINTS.CONSTRAINT_COMMENTS(conn, data.schema, data.name, data.exclude_constraint)}}
