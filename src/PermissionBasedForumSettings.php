<?php

/*
 * This file is part of fof/user-directory.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\UserDirectory;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;

class PermissionBasedForumSettings
{
    /**
     * @var SettingsRepositoryInterface
     */
    protected $settings;

    public function __construct(SettingsRepositoryInterface $settings)
    {
        $this->settings = $settings;
    }

    public function __invoke(ForumSerializer $serializer): array
    {
        $attributes = [];

        // The link is visible if the user can access the user directory AND the link was enabled in extension settings
        $attributes['canSeeUserDirectoryLink'] = $serializer->getActor()->can('fof.user-directory.view') && $this->settings->get('fof-user-directory-link');
        $attributes['userDirectorySmallCards'] = (bool) $this->settings->get('fof-user-directory.use-small-cards');
        $attributes['userDirectoryDisableGlobalSearchSource'] = (bool) $this->settings->get('fof-user-directory.disable-global-search-source');
        $attributes['userDirectoryDefaultSort'] = $this->settings->get('fof-user-directory.default-sort') ?: 'default';

        // Only serialize if the actor has permission
        if ($permission = $serializer->getActor()->hasPermission('user.suspend')) {
            $attributes['hasSuspendPermission'] = $permission;
        }

        return $attributes;
    }
}
