export const GET_FUNGIBLE_ASSETS_DETAILED = `
query GetFungibleAssetsDetailed($userAddress: String!) {
  current_fungible_asset_balances(
    where: {
      owner_address: {_eq: $userAddress},
      amount: {_gt: 0}
    }
  ) {
    asset_type
    amount
    last_transaction_timestamp
    owner_address
    storage_id
    is_frozen
    is_primary
    token_standard
    metadata {
      token_standard
      name
      symbol
      decimals
      icon_uri
      project_uri
      asset_type
      supply_aggregator_table_handle_v1
      supply_aggregator_table_key_v1
    }
  }
}
`;

export const GET_MOVE_BALANCE_QUERY = `
query GetAptosCoinBalance($userAddress: String!, $assetType: String!) {
  current_fungible_asset_balances(
    where: {
      owner_address: {_eq: $userAddress},
      asset_type: {_eq: $assetType},
      amount: {_gt: 0}
    }
  ) {
    asset_type
    amount
    last_transaction_timestamp
    metadata {
      token_standard
      name
      symbol
      decimals
      icon_uri
      project_uri
      asset_type
    }
  }
}
`;

export const GET_FUNGIBLE_ASSET_ACTIVITIES = `
query GetFungibleAssetActivities($ownerAddress: String!, $limit: Int, $offset: Int) {
  fungible_asset_activities(
    where: {
      owner_address: {_eq: $ownerAddress},
      is_transaction_success: {_eq: true}
    },
    order_by: {transaction_timestamp: desc},
    limit: $limit,
    offset: $offset
  ) {
    transaction_version
    transaction_timestamp
    amount
    asset_type
    type
    owner_address
    is_transaction_success
  }
}
`;

export const GET_USER_OBJECTS = `
query GetUserObjects($ownerAddress: String!) {
  current_objects(
    where: { owner_address: { _eq: $ownerAddress } }
  ) {
    object_address
    owner_address
    last_transaction_version
  }
}
`;

export const GET_RESOURCES_BY_ADDRESSES = `
query GetResourcesByAddresses($addresses: [String!]!) {
  current_resources(
    where: { address: { _in: $addresses } }
  ) {
    address
    resource_type
    data
  }
}
`;
