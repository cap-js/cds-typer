entity Users {
    key id: UUID;
    roles: Composition of many {
        key role : Association to UserRoles
    };
    roleGroups: Composition of many {
        key roleGroup : Association to UserRoleGroups
    };
}

entity UserRoles  {
    users: Composition of many Users.roles
        on users.role = $self;
}

entity UserRoleGroups {
    users: Composition of Users.roleGroups
        on users.roleGroup = $self;
}