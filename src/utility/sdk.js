import { WebServiceClient as ServiceClient } from 'snet-sdk-web';

import { APIEndpoints, APIPaths } from '../config/APIEndpoints';

const parseMetadata = (response) => {
  const { data } = response;
  const channelId = data['snet-payment-channel-id'];
  const nonce = data['snet-payment-channel-nonce'];
  const signingAmount = data['snet-payment-channel-amount'];
  const hexSignature = data['snet-payment-channel-signature-bin'];
  const signatureBytes = Buffer.from(hexSignature, 'hex');

  return { channelId, nonce, signingAmount, signatureBytes };
};

const metadataGenerator = (username) => async (serviceClient, serviceName, method) => {
  const { orgId: org_id, serviceId: service_id } = serviceClient.metadata;
  const payload = { org_id, service_id, service_name: serviceName, method, username };
  return fetch(`${APIEndpoints.GET_SERVICE_LIST.endpoint}${APIPaths.GET_SIGNATURE}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => res.json())
    .then(parseMetadata);
};

const parseServiceMetadata = (response) => {
  const { data: groups } = response;
  const endpoints = groups.map(({group_name, endpoints }) => ({ group_name, ...endpoints[0] }));
  const defaultGroup = groups.find(group => group.group_name === 'default_group');

  return { defaultGroup, groups, endpoints };
};

const fetchServiceMetadata = async (org_id, service_id) => {
  const apiEndpoint = `${APIEndpoints.GET_SERVICE_LIST.endpoint}/org/${org_id}/service/${service_id}/group`;
  return fetch(apiEndpoint).then(res => res.json()).then(parseServiceMetadata);
};

export const createServiceClient = async (org_id, service_id, username) => {
  const options = { metadataGenerator: metadataGenerator(username) };
  const metadata = await fetchServiceMetadata(org_id, service_id);
  const serviceClient = new ServiceClient(undefined, org_id, service_id, undefined, metadata, metadata.defaultGroup, undefined, options);
  return {
    invoke: serviceClient.invoke.bind(serviceClient),
    unary: serviceClient.unary.bind(serviceClient)
  };
};

export const getMethodNames = (service) => {
  const ownProperties = Object.getOwnPropertyNames(service);
  return ownProperties.filter(property => {
    if(service[property] && typeof service[property] === typeof {}) {
      return !!(service[property].methodName);
    }
  });
};
