define('deathangel',
    ['underscore'],
    function(_) {
        
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
                if (state.support > 0) {
                    states.push(s.reroll('miss'));
                    states.push(s.next(Choice('save_reroll')));
                } else {
                    states.push(s);
                }

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
                        states.push(s.reroll('defense'));
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
                if (state.support > 0) {
                    states.push(s.reroll('miss'));
                    states.push(s.next(Choice('save_reroll')));
                } else {
                    states.push(s);
                }
                
                return states;
            }
        });
        
        var Noctis = _.extend({}, VanillaMarine, {
            get_states_attack : function(state) {
                var states = [];
                var s;

                s =  state.next(Chance('shot_hit', 0.5),
                {
                    front : state.front - 1,
                    remaining_shots : state.remaining_shots -1
                });
                if (s.front > 0 && s.support > 0) {
                    states.push(s.reroll('hit'));
                    states.push(s.next(Choice('save_reroll')));
                } else {
                    states.push(s);
                }

                s =  state.next(Chance('deadly_aim', 1.0/6.0),
                {
                    front : Math.max(0, state.front - 3),
                    remaining_shots : state.remaining_shots -1
                });
                states.push(s);

                s = state.next(Chance('shot_miss', 2.0/6.0), 
                {
                    remaining_shots : state.remaining_shots - 1
                });
                if (state.support > 0) {
                    states.push(s.reroll('miss'));
                    states.push(s.next(Choice('save_reroll')));
                } else {
                    states.push(s);
                }
                
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
                    if (i < 5 && s.front > 0 && s.support > 0) {
                        states.push(s.reroll('cleansing_flames_x' + i));
                        states.push(s.next(Choice('save_reroll')));
                    } else {
                        states.push(s);
                    }
                }
                return states;
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
            reroll : function(description) {
                var ev = Choice('reroll_' + description);
                return _.extend(this.next(ev, this.previous), {
                    support : this.support - 1
                });
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
            Digester : Digester,
            marines : {
                Valencio : VanillaMarine,
                Leon : Leon,
                Callistarius : Callistarius,
                Noctis : Noctis,
                Zael : Zael
            },
            State : State
        };
    })