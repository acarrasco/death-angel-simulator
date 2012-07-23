define('simulator',
    ['underscore'],
    function(_) {
        
        /**
         * Explores recursivelly all the posibilities of a scenario.
         * 
         * @param digest The function that takes a final state and saves it in 
         * the report.
         * @param get_next_states The function that given one state, returns a
         * list with all the next states (or an empty list if it was a final state).
         * @param state The initial state for the scenario to simulate.
         */
        function explore(digest, get_next_states, state) {
            function explore_recursively(s) {
                var next_states = get_next_states(s);
                if (next_states.length == 0) {
                    digest(s);
                } else {
                    _.forEach(next_states, explore_recursively);
                }
            }
            
            return explore_recursively(state);
        }
        
        return {
            explore : explore
        }
    })