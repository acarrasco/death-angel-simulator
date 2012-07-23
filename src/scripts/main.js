/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

require(['jquery', 'underscore', 'deathangel', 'simulator'], 
    function($, _, DeathAngel, Simulator) {
    
        function fill_select(select, seq) {
            _.forEach(seq, function(x) {
                select.append(new Option(x, x))
                })
        }
        
        function simulate() {
            var results = $('#results');
            
            function digest(state) {
                var p = 1.0;
                var choices = [];
                _.each(state.path, function(x) {
                    p *= x.probability;
                    if (x.type == 'choice') {
                        choices.push(x.description);
                    }
                });
                var tr = $('<tr/>');
                tr.append($('<td/>').text(p));
                tr.append($('<td/>').text(state.marine_dead));
                tr.append($('<td/>').text(state.front));
                tr.append($('<td/>').text(state.behind));
                tr.append($('<td/>').text(state.support));
                tr.append($('<td/>').text(_.pluck(state.path, 'description')));
                results.append(tr);
            }
            
            var marineName = $('#marine :selected').text();
            var marine = DeathAngel.marines[marineName];
            var state = new DeathAngel.State(marine, 
                Number($('#support_tokens :selected').text()), 
                Number($('#genestealers_front :selected').text()),
                Number($('#genestealers_behind :selected').text()));
            
            Simulator.explore(digest, DeathAngel.next_states_for_turn, state);
        }
    
        function init() {
            fill_select($('#genestealers_behind'), _.range(8));
            fill_select($('#genestealers_front'), _.range(8));
            fill_select($('#support_tokens'), _.range(8));
            
            fill_select($('#marine'), _.keys(DeathAngel.marines));
            
            $('#simulate_btn').on('click', simulate);
        }
    
        $(init);
    }
    )