CREATE FOREIGN TABLE IF NOT EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"(
    col1 bigint NULL,
    col2 text NULL
)
    SERVER test_fs_for_foreign_table;

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

COMMENT ON FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';

GRANT ALL ON TABLE public."FT1_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
