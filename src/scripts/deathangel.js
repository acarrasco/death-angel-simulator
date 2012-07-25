define('deathangel',
    ['underscore'],
    function(_) {
        
        var dice_skulls = [false, true, true, true,false, false];
        
        var attack_reroll_choices = function(state, states_list) {
            if (state.support == 0 || state.front == 0) {
                states_list.push(state);
            } else if (state.support > 0 && state.front >= 5) {
                states_list.push(state.reroll());
            } else {
                states_list.push(state.reroll());
                states_list.push(state.save_reroll());
            }
        };
        
        var VanillaMarine = {
            shots : 1,
            
            get_states_attack : function(state) {
                var states = [];
                var s;
                
                s =  state.next(Chance('shot_hit', 0.5),
                {
                    front : state.front - 1, 
                    remaining_shots : state.remaining_shots - 1
                });
                states.push(s);

                s = state.next(Chance('shot_miss', 0.5), 
                {
                    remaining_shots : state.remaining_shots - 1
                });
                attack_reroll_choices(s, states);

                return states;
            },
            
            get_states_defend_front : function(state) {
                var states = [];
                var s;
                var fail_p = Math.min(1.0, (state.front+1) / 6.0);
                
                if (state.front >= 5) {
                    s = state.next(Chance('front_defense_fails', 1.0),
                    {
                        marine_dead : true, 
                        attacked_front : true
                    });
                    states.push(s);
                } else {
                    s = state.next(Chance('front_defense_success', 1-fail_p), {
                        attacked_front : true
                    });
                    states.push(s);
                    
                    s = state.next(Chance('front_defense_fails', fail_p), 
                    {
                        marine_dead : true, 
                        attacked_front : true
                    });
                    
                    if (state.support > 0) {
                        states.push(s.reroll());
                    } else {
                        states.push(s);
                    }
                }
                
                return states;
            },
            
            get_states_defend_behind : function(state) {
                var states = [];
                var s;
                var fail_p = Math.min(1.0, (state.behind+1) / 6.0);
                
                if (state.behind >= 5) {
                    s = state.next(Chance('behind_defense_fails', 1.0),
                    {
                        marine_dead : true, 
                        attacked_behind : true
                    });
                    states.push(s);
                } else {
                    s = state.next(Chance('behind_defense_success', 1-fail_p), {
                        attacked_behind : true
                    });
                    states.push(s);
                    
                    s = state.next(Chance('behind_defense_fails', fail_p), 
                    {
                        marine_dead : true, 
                        attacked_behind : true
                    });
                    
                    states.push(s);
                }
                
                return states;
            }
        }
        
        var Leon = _.extend({}, VanillaMarine, {
            shots : 3
        });
        
        var Callistarius = _.extend({}, VanillaMarine, {
            get_states_attack : function(state) {
                var states = [];
                var s;
                
                s =  state.next(Chance('shot_hit', 0.5),
                {
                    front : state.front - 1
                });
                states.push(s);

                s = state.next(Chance('shot_miss', 0.5), 
                {
                    remaining_shots : state.remaining_shots - 1
                });
                attack_reroll_choices(s, states);
                
                return states;
            }
        });
        
        var Noctis = _.extend({}, VanillaMarine, {
            get_states_attack : function(state) {
                var states = [];
                var s;
                
                s =  state.next(Chance('deadly_aim', 1.0/6.0),
                {
                    front : Math.max(0, state.front - 3),
                    remaining_shots : state.remaining_shots -1
                });
                states.push(s);

                s =  state.next(Chance('shot_hit', 0.5),
                {
                    front : state.front - 1,
                    remaining_shots : state.remaining_shots -1
                });
                attack_reroll_choices(s, states);

                s = state.next(Chance('shot_miss', 2.0/6.0), 
                {
                    remaining_shots : state.remaining_shots - 1
                });
                attack_reroll_choices(s, states);
                
                return states;
            }
        });
        
        var Zael = _.extend({}, VanillaMarine, {
            get_states_attack : function(state) {
                var states = [];
                var s;

                for (var i = 0; i < 6; i++) {
                    s = state.next(Chance('cleansing_flames_x' + i, 1.0/6.0), {
                        front : Math.max(0, state.front - i),
                        remaining_shots : state.remaining_shots - 1
                    });
                    if (i < 5) {
                        attack_reroll_choices(s, states);
                    } else {
                        states.push(s);
                    }
                }
                return states;
            }
        });
        
        var Gideon = _.extend({}, VanillaMarine, {
            shots : 0,
            _defense_success_p : function(swarm_size) {
                var saves = 0;
                for (var i = 0; i < 6; i++) {
                    if (dice_skulls[i] || i > swarm_size) {
                        saves += 1;
                    }
                }
                return saves/6.0;
            },
            get_states_defend_front : function(state) {
                var states = [];
                var success_p = this._defense_success_p(state.front);
                var s = state.next(Chance('front_defense_success', success_p), 
                {
                    attacked_front : true
                });
                states.push(s);
                
                s = state.next(Chance('front_defense_fails', 1-success_p), {
                    attacked_front : true,
                    marine_dead : true
                });
                if (state.support > 0) {
                    states.push(s.reroll());
                } else {
                    states.push(s);
                }
                
                return states;
            },
            get_states_defend_behind : function(state) {
                var success_p = this._defense_success_p(state.behind);
                return [
                state.next(Chance('behind_defense_success', success_p),
                {
                    attacked_behind : true
                }),
                state.next(Chance('behind_defense_fails', 1-success_p),
                {
                    attacked_behind : true,
                    marine_dead : true
                })
                ];
            }
        });
        
        var Lorenzo = _.extend({}, VanillaMarine, {
            shots : 0,
            _get_states_defense : function(state, side) {
                var states = [];
                var counter_attack_p = 0;
                var defense_fails_p = 0;
                var defense_success_p = 0;
                var swarm_size = state[side];
                var support = side == 'front' ? state.support : 0;
                
                for (var i = 0; i < 6; i++) {
                    if (dice_skulls[i]) {
                        counter_attack_p += 1.0/6.0;
                    } else if (i > swarm_size) {
                        defense_success_p += 1.0/6.0;
                    } else {
                        defense_fails_p += 1.0/6.0;
                    }
                }
                
                var mod = {};
                mod['attacked_' + side] = true;
                var s = state.next(Chance(side + '_defense_success', defense_success_p),
                    mod);
                if (support > 0) {
                    states.push(s.reroll());
                    states.push(s.save_reroll());
                } else {
                    states.push(s);
                }
                
                mod = {};
                mod['attacked_' + side] = true;
                mod.marine_dead = true;
                s = state.next(Chance(side + '_defense_fails', defense_fails_p), mod);
                if (support > 0) {
                    states.push(s.reroll());
                } else {
                    states.push(s);
                }

                mod = {};
                mod[side] = swarm_size - 1;
                s = state.next(Chance(side + '_counter_attack', counter_attack_p), mod);
                states.push(s);
                
                return states;
            },
            get_states_defend_front : function(state) {
                return this._get_states_defense(state, 'front');
            },
            get_states_defend_behind : function(state) {
                return this._get_states_defense(state, 'behind');
            }
        });
        
        function Chance(description, probability) {
            if (!(this instanceof Chance)) {
                return new Chance(description, probability);
            }
            this.type = 'chance';
            this.description = description;
            this.probability = probability;
            return this;
        }
        
        function Choice(description) {
            if (!(this instanceof Choice)) {
                return new Choice(description);
            }
            this.type = 'choice';
            this.description = description;
            this.probability = 1.0;
            return this;
        }
        
        /**
         * This represents a state of the game.
         */
        function State(marine, supportTokens, frontGss, behindGss) {
            if (!(this instanceof State)) {
                return new State(marine, supportTokens, frontGss, behindGss);
            }
            
            this.marine = marine;
            this.remaining_shots = marine.shots;
            this.support = supportTokens;
            this.front = frontGss;
            this.behind = behindGss;
            
            this.path = [];
            this.marine_dead = false;
            this.attacked_front = false;
            this.attacked_behind = false;
            
            return this;
        }
        _.extend(State.prototype, {
            next : function(ev, changes) {
                return _.extend({},
                    this, 
                    changes,
                    {
                        previous : this,
                        path : this.path.concat(ev)
                    }
                    );
            },
            reroll : function() {
                var ev = Choice('reroll_' + _.last(this.path).description);
                return _.extend(this.next(ev, this.previous), {
                    support : this.support - 1
                });
            },
            save_reroll : function() {
                var ev = Choice('save_reroll_' + _.last(this.path).description);
                return this.next(ev, {});
            }
        });
        
        /**
         * This dispatches the correct function for the turn phase.
         */
        function next_states_for_turn(state) {
            if (state.marine_dead) {
                return [];
            } else if (state.front > 0 && state.remaining_shots > 0) {
                return state.marine.get_states_attack(state);
            } else if (state.front > 0 && !state.attacked_front) {
                return state.marine.get_states_defend_front(state);
            } else if (state.behind > 0 && !state.attacked_behind) {
                return state.marine.get_states_defend_behind(state);
            } else {
                return [];
            }
        }
        
        return {
            next_states_for_turn : next_states_for_turn,
            marines : {
                'Valencio' : VanillaMarine,
                'Leon' : Leon,
                'Callistarius' : Callistarius,
                'Noctis' : Noctis,
                'Zael' : Zael,
                'Gideon (supporting)' : Gideon,
                'Lorenzo (supporting)' : Lorenzo
            },
            State : State
        };
    })