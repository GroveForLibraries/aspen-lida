import React from 'react';

/**
 * AuthContext is a React context for managing authentication state and providing authentication-related functions to its consumers.
 * @type {React.Context<unknown>}
 */
export const AuthContext = React.createContext();

/**
 * AuthProvider component for managing authentication state and providing authentication context to its children.
 * @param param0
 * @param param0.children
 * @returns {React.JSX.Element}
 * @constructor
 */
export const AuthProvider = ({ children }) => {
     const [state, dispatch] = React.useReducer(
          (prevState, action) => {
               switch (action.type) {
                    case 'RESTORE_TOKEN':
                         return {
                              ...prevState,
                              userToken: action.token,
                              isLoading: false,
                         };
                    case 'SIGN_IN':
                         return {
                              ...prevState,
                              isSignOut: false,
                              userToken: action.token,
                         };
                    case 'SIGN_OUT':
                         return {
                              ...prevState,
                              isSignOut: true,
                              userToken: null,
                         };
               }
          },
          {
               isLoading: true,
               isSignOut: false,
               userToken: null,
          }
     );

     const authContext = React.useMemo(
          () => ({
               signIn: async (data) => {
                    dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
               },
               signOut: () => dispatch({ type: 'SIGN_OUT' }),
               signUp: async (data) => {
                    dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
               },
               state,
               dispatch
          }),
          [state]
     );

     return (
          <AuthContext.Provider value={authContext}>
               {children}
          </AuthContext.Provider>
     );
};
