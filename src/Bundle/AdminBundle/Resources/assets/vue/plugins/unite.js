
import Vue from 'vue';
import gql from 'graphql-tag';
import {getIntrospectionQuery} from 'graphql'
import { IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ListFieldTypeFallback from "../components/Fields/List/_fallback";
import FormFieldTypeFallback from "../components/Fields/Form/_fallback";
import ViewTypeFallback from "../components/Views/_fallback";
import User from "../state/User";
import router from "./router";

const removeIntroSpecType = function(val){
    if(val && typeof val === 'object') {

        if(Array.isArray(val)) {
            val = val.map(removeIntroSpecType);
        } else {
            Object.keys(val).forEach((key) => {
                if(key === '__typename') {
                    delete val[key];
                } else {
                    val[key] = removeIntroSpecType(val[key]);
                }
            });
        }
    }

    return val;
};

const innerType = function(type) {
    return type.ofType ? innerType(type.ofType) : type.name;
};

const createAdminView = function (view, unite) {
    view = removeIntroSpecType(view);
    view.listFields = function(){ return this.fields.filter(field => field.show_in_list); };
    view.formFields = function(){ return this.fields.filter(field => field.show_in_form); };

    view.rawType = unite.getRawType(view.type);
    view.fields.forEach((field) => {

        // Set raw field to field
        view.rawType.fields.forEach((rawField) => {
            if(field.id === rawField.name) {
                field.rawField = rawField;
            }
        });

        // normalize returnType
        field.returnType = innerType(field.rawField.type);

    });

    /**
     * Returns an array with field query statements for all form fields of this view.
     * @returns Array
     */
    view.queryFormData = function(){
        return this.formFields().filter((field) => {
            return !!unite.getFormFieldType(field.type).queryData;
        }).map((field) => {
            return unite.getFormFieldType(field.type).queryData(field);
        });
    };

    /**
     * Returns an array with all normalized values for all form fields of this view.
     * @returns Array
     */
    view.normalizeFormData = function(inputData = {}){
        let data = {};
        this.formFields().forEach((field) => {
            let type = unite.getFormFieldType(field.type);
            let inputFieldData = inputData[field.id] || undefined;
            data[field.id] = !!type.normalizeData ? type.normalizeData(inputFieldData, field) : inputFieldData;
        });
        return data;
    };

    return view;
};

export const Unite = new Vue({

    data() {
        return {
            loaded: false,
            rawTypes: [],
            listFieldTypes: {},
            formFieldTypes: {},
            viewTypes: {},
            adminViews: {},
        }
    },
    created() {
        this.$on('registerListFieldType', (type, field) => {
            this.listFieldTypes[type] = field;
        });

        this.$on('registerFormFieldType', (type, field) => {
            this.formFieldTypes[type] = field;
        });

        this.$on('registerViewType', (type, view) => {
            this.viewTypes[type] = view;
        });

        this.$on('load', (reload = false, success, fail, fin) => {
            this.loadAdminViews(reload, success, fail, fin);
        });

        User.$watch('user.token', () => {
            this.loadAdminViews();
        });
    },
    computed: {
        adminViewsFragment() {

            let fragments = [];
            let fragmentNames = [];
            Object.keys(this.viewTypes).forEach((type) => {
                if(this.viewTypes[type].fragments && this.viewTypes[type].fragments.adminView) {
                    fragmentNames.push(`... ${type}Fragment`);
                    fragments.push(this.viewTypes[type].fragments.adminView.loc.source.body);
                }
            });

            return `
                ${ fragments.join("\n") }
                
                fragment adminViews on UniteAdminView {
                    viewType :__typename
                    id
                    type
                    name
                    fragment
                    category
                    fields {
                        id
                        name
                        description
                        type
                        non_null
                        list_of
                        show_in_list
                        show_in_form
                        form_group
                    }
                    permissions {
                        create
                    }
                    ${fragmentNames.join("\n")}
                }`;
        },
    },
    methods: {

        /**
         * Do a full schema introspection and load all adminViews.
         *
         * @param reload
         * @param success
         * @param fail
         * @param fin
         */
        loadAdminViews(reload, success, fail, fin) {

            if(!User.isAuthenticated || (!reload && this.loaded)) {
                if(success) { success(); }
                return;
            }

            this.loaded = false;

            this.$apollo.query({
                query: gql(getIntrospectionQuery()),
            }).then((data) => {
                this.rawTypes = data.data.__schema.types;
                this.fragmentMatcher.possibleTypesMap = this.fragmentMatcher.parseIntrospectionResult(data.data);

                this.$apollo.query({
                    query: gql`
                        ${ this.adminViewsFragment }
                        query {
                            unite {
                                adminViews {
                                    ... adminViews
                                }
                            }
                        }
                    `,
                }).then((data) => {
                    this.adminViews = [];
                    data.data.unite.adminViews.forEach((view) => {
                        this.adminViews[view.id] = createAdminView(view, this);
                    });

                    this.loaded = true;
                    this.$emit('loaded');

                }).catch(fail).finally(fin).then(success);
            }).catch((error) => {
                User.$emit('logout', {}, () => {
                    router.push('/login');
                })
            });
        },

        /**
         * Returns a rawType for the given name.
         *
         * @param typeName
         * @returns {*|{extends}}
         */
        getRawType(typeName) {
            let found = this.rawTypes.filter((type) => { return type.name === typeName });
            return found.length > 0 ? found[0] : null;
        },

        /**
         * Get all registered list field types.
         *
         * @param type
         * @returns {*|{extends}}
         */
        getListFieldType(type) {
            return this.listFieldTypes[type] || ListFieldTypeFallback;
        },

        /**
         * Get all registered form field types.
         *
         * @param type
         * @returns {*|{extends}}
         */
        getFormFieldType(type) {
            return this.formFieldTypes[type] || FormFieldTypeFallback;
        },

        /**
         * Get all registered view field types.
         *
         * @param type
         * @returns {*|{extends}}
         */
        getViewType(type) {
            return this.viewTypes[type] || ViewTypeFallback;
        },
    }
});

Unite.fragmentMatcher = new IntrospectionFragmentMatcher({
    introspectionQueryResultData: {
        __schema: {
            types: [],
        },
    },
});

export const VueUnite = {
    install: function(Vue, options){
        Vue.prototype.$unite = Unite;
    }
};