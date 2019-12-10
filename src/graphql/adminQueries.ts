import gql, { DocumentNode } from "graphql-tag-ts";

import { UserType } from "../../constants";
import { IfImplements } from "../../typings/utils";
import { Program, User } from "./medium";

type IAllUsersAdmin = IfImplements<
  {
    email: string;
    name: string;
    tries: number;
    type: UserType;
    rut_id?: string;
    show_dropout: boolean;
    locked: boolean;
    programs: { id: string }[];
  },
  User
>[];

const AllUsersAdminFragment = gql`
  fragment allUsersAdminFragment on User {
    email
    name
    tries
    type
    rut_id
    show_dropout
    locked
    programs {
      id
    }
  }
`;

export const allUsersAdminQuery: DocumentNode<{
  users: IAllUsersAdmin;
}> = gql`
  query {
    users {
      ...allUsersAdminFragment
    }
  }
  ${AllUsersAdminFragment}
`;

export const allProgramsAdminQuery: DocumentNode<{
  programs: IfImplements<{ id: string }, Program>[];
}> = gql`
  query {
    programs {
      id
    }
  }
`;

export const addUsersProgramsAdminMutation: DocumentNode<
  {
    addUsersPrograms: IAllUsersAdmin[];
  },
  {
    user_programs: {
      email: string;
      program: string;
    }[];
  }
> = gql`
  mutation($user_programs: [UserProgram!]!) {
    addUsersPrograms(user_programs: $user_programs) {
      ...allUsersAdminFragment
    }
  }
  ${AllUsersAdminFragment}
`;

export const updateUserProgramsAdminMutation: DocumentNode<
  {
    updateUserPrograms: IAllUsersAdmin;
  },
  {
    update_user: {
      email: string;
      programs: string[];
      oldPrograms: string[];
    };
  }
> = gql`
  mutation($update_user: UpdateUserPrograms!) {
    updateUserPrograms(userPrograms: $update_user) {
      ...allUsersAdminFragment
    }
  }
  ${AllUsersAdminFragment}
`;

export const adminUpsertUsersMutation: DocumentNode<
  {
    upsertUsers: IAllUsersAdmin;
  },
  {
    users: {
      oldEmail?: string;
      email: string;
      name?: string;
      type?: UserType;
      tries?: number;
      rut_id?: string;
      show_dropout?: boolean;
      locked?: boolean;
    }[];
  }
> = gql`
  mutation($users: [UpsertedUser!]!) {
    upsertUsers(users: $users) {
      ...allUsersAdminFragment
    }
  }
  ${AllUsersAdminFragment}
`;

export const adminDeleteUserMutation: DocumentNode<
  {
    deleteUser: IAllUsersAdmin;
  },
  {
    email: string;
  }
> = gql`
  mutation($email: EmailAddress!) {
    deleteUser(email: $email) {
      ...allUsersAdminFragment
    }
  }
  ${AllUsersAdminFragment}
`;

export const adminLockMailUserMutation: DocumentNode<
  {
    lockMailUser: {
      mailResult: Record<string, any>;
      users: IAllUsersAdmin;
    };
  },
  { email: string }
> = gql`
  mutation($email: EmailAddress!) {
    lockMailUser(email: $email) {
      mailResult
      users {
        ...allUsersAdminFragment
      }
    }
  }
  ${AllUsersAdminFragment}
`;

export const adminMailLockedUsersMutation: DocumentNode<{
  mailAllLockedUsers: Record<string, any>[];
}> = gql`
  mutation {
    mailAllLockedUsers
  }
`;
