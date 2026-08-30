import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"

export const rankingSources = {
  "hot-topic": {
    metadata: {
      title: "热门话题",
      home: "/",
      type: "ranking",
    },
    loader: {
      type: "json",
      url: "/hot_event/list.json?count=10",
      items: "list",
      fields: {
        url: {
          select: "tag",
          template: "/k?q={{ scope.value | url_query }}",
        },
        title: {
          select: "tag",
          template: "{{ scope.value | remove: \"#\" }}",
        },
        content: {
          pictures: "pic",
        },
      },
    },
    radar: [{
      id: "xueqiu-hot-topic",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
    }],
  },
  "hot-fund": {
    metadata: {
      title: "热门基金",
      home: "/",
      type: "ranking",
    },
    loader: {
      type: "json",
      url: "/snb/dj/fundx/activity/x/web/searchFund?fund_type=0&business_code=20",
      items: "data.public_fund",
      fields: {
        url: {
          select: "fund_code",
          template: "/S/{{ scope.value | url_path }}",
        },
        title: "fund_name",
        attributes: {
          returnPeriod: "profit_desc",
          returnRate: {
            select: "profit_rate",
            template: "{{ scope.value | times: 100 | round: 2 }}",
          },
        },
      },
      inlineTemplate: "{{ scope.item.attributes.returnPeriod }} · {{ scope.item.attributes.returnRate }}%",
    },
    radar: [{
      id: "xueqiu-hot-fund",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
    }],
  },
} satisfies Record<string, ProviderSourceConfig>
