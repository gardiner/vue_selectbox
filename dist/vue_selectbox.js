define(['lodash', 'jquery'], function(_, $) {
    "use strict";

    return {
        template: "<div class='selectbox'><div class='inputframe' tabindex='0' v-on:click='activate' v-on:focus='activate'><span class='value' tabindex='-1' v-for='item in value'><div class='icon clear active' v-on:click='function(e) { unset_value(item); e.stopPropagation(); return false; }'></div><slot :item='item' name='selected'>{{ pretty(item) }}</slot></span><span class='placeholder' v-if='!has_value'>{{ is_open ? '&nbsp;' : safe_placeholder }}</span></div><div class='candidates' v-if='is_open'><div class='input'><input autocomplete='off' type='text' v-model='input' v-on:keydown.down='next' v-on:keydown.enter.prevent='select' v-on:keydown.esc='close' v-on:keydown.up='prev'></div><div :class='{active: is_add_visible}' class='icon add' v-on:click='add_candidate'></div><div :class='{active: input}' class='icon clear' v-on:click='close'></div><ul v-if='filtered_candidates.length &gt; 0'><li v-bind:class='{selected: is_selected(c), active: (current === $index)}' v-bind:title='pretty(c)' v-for='c, $index in filtered_candidates' v-on:click='select' v-on:mouseenter='set_current($index)'><slot :item='c' name='candidate'>{{ pretty(c) }}</slot></li></ul></div></div>",
        props: [
            'candidates',   //selectable items
            'placeholder',  //placeholder text
            'model',        //selected value
            'label',        //item property for displaying and searching
            'multiple',     //whether multiple items can be selected
            'options'       //configuration options, see this.config
        ],
        //allows use of v-model directive
        model: {
            'prop': 'model',
            'event': 'update'
        },
        data: function() {
            return {
                is_open: false,
                current: false,
                value: [],
                input: ""
            };
        },
        computed: {
            /**
             * Returns configuration as specified by options prop.
             */
            config: function() {
                return _.assign({
                    allow_adding: false,                //allows adding of new values. Triggers 'add' event
                    close_after_select: !this.multiple, //closes the selectbox after selecting an item
                    close_after_add: !this.multiple,    //closes the selectbox after adding an item
                    close_after_deselect: true,         //closes the selectbox after deselecting the last item
                    add_on_select: true                 //adds a new value when pressing enter
                }, this.options);
            },
            filtered_candidates: function() {
                var self = this;

                if (self.input) {
                    return _.filter(self.candidates, function(item) {
                        var label = self.pretty(item);
                        return label.toLowerCase().match(new RegExp(self.input.toLowerCase()));
                    });
                } else {
                    return self.candidates;
                }
            },
            has_value: function() {
                return !_.isEmpty(this.value);
            },
            is_multiple: function() {
                return !!this.multiple;
            },
            is_add_visible: function() {
                return this.input && this.config.allow_adding;
            },
            safe_placeholder: function() {
                return this.placeholder || "Search...";
            }
        },
        mounted: function() {
            var self = this;
            $(document)
            .on('click close_selectboxes', function(e) {
                if (!$(self.$el).has(e.target).length) {
                    self.close();
                }
            });
        },
        watch: {
            model: {
                handler: function(model) {
                    if (this.is_multiple) {
                        this.value = model ? _.clone(model) : [];
                    } else {
                        this.value = model ? [model] : null;
                    }
                },
                immediate: true
            }
        },
        methods: {
            activate: function($event) {
                $(document).trigger('close_selectboxes');
                if (!$event || ($event.keyCode !== 13 && $event.keyCode !== 27)) {
                    this.is_open = true;
                    this.focus();
                    return false;
                }
            },
            focus: function() {
                var self = this;

                window.setTimeout(function() { $(self.$el).find('input').focus(); });
            },
            close: function() {
                this.is_open = false;
                this.current = false;
                this.input = null;
            },
            /**
             * Highlights the value with the specified index.
             */
            set_current: function(index) {
                var num = this.filtered_candidates.length;

                if (index === false || this.is_selected(this.get_by_index(index))) {
                    this.current === false;
                } else {
                    this.current = (index + num) % num;
                }
                if (num > 1) {
                    this.check_scroll();
                }
            },
            check_scroll: function() {
                var $candidates = $(this.$el).find('.candidates ul'),
                    $current = $candidates.children().eq(this.current),
                    height = $candidates.outerHeight(),
                    min = $candidates.scrollTop(),
                    max = min + height,
                    current_min = min + $current.position().top,
                    current_max = current_min + $current.outerHeight();

                if (current_max > max) {
                    $candidates.scrollTop(current_max - height);
                } else if (current_min < min) {
                    $candidates.scrollTop(current_min);
                }
            },
            get_by_index: function(index) {
                var num = this.filtered_candidates.length;
                return this.filtered_candidates[(index + num) % num];
            },
            find_next: function(direction) {
                var num = this.filtered_candidates.length,
                    next_index;

                if (this.current === false) {
                    next_index = (direction > 0) ? 0 : -1;
                } else {
                    next_index = this.current + direction;
                }

                //skip selected values, but limited tries to avoid endless loop
                while (this.is_selected(this.get_by_index(next_index)) && next_index < (2 * num) && next_index > (-2 * num)) {
                    next_index += direction;
                }

                return next_index;
            },
            next: function() {
                this.set_current(this.find_next(1));
            },
            prev: function() {
                this.set_current(this.find_next(-1));
            },
            /**
             * Selects the currently highlighted value.
             */
            select: function() {
                var selected;
                if (this.current !== false && this.filtered_candidates.length) {
                    selected = this.filtered_candidates[this.current];
                    if (!this.is_selected(selected)) {
                        this.set_value(selected);

                        if (this.config.close_after_select) {
                            this.close();
                        } else {
                            this.focus();
                        }
                    }
                } else if (this.config.add_on_select) {
                    this.add_candidate();
                }
            },
            /**
             * Updates the value and emits event.
             */
            set_value: function(value) {
                this.input = "";
                if (this.is_multiple) {
                    this.value.push(value);
                    this.$emit('update', this.value);
                } else {
                    this.value = value ? [value] : null;
                    this.$emit('update', value);
                }
            },
            unset_value: function(value) {
                if (this.is_multiple) {
                    this.value = _.without(this.value, value);
                    this.$emit('update', this.value);
                } else {
                    this.value = null;
                    this.$emit('update', this.value);
                }
                if (_.isEmpty(this.value) && this.config.close_after_deselect) {
                    this.close();
                } else {
                    this.focus();
                }
            },
            pretty: function(item) {
                return this.label ? _.get(item, this.label) : item;
            },
            is_selected: function(item) {
                return _.includes(this.value, item);
            },
            add_candidate: function() {
                if (this.config.allow_adding && this.input) {
                    this.$emit('add', this.input);
                    if (this.config.close_after_add) {
                        this.close();
                    } else {
                        this.input = null;
                    }
                }
            }
        }
    };
});